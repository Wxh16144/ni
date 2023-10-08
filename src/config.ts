import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import ini from 'ini'
import { findUp } from 'find-up'
import type { Agent } from './agents'
import { LOCKS } from './agents'

const customRcPath = process.env.NI_CONFIG_FILE

const home = process.platform === 'win32'
  ? process.env.USERPROFILE
  : process.env.HOME

const defaultRcPath = path.join(home || '~/', '.nirc')

const rcPath = customRcPath || defaultRcPath

interface Config {
  defaultAgent: Agent | 'prompt'
  globalAgent: Agent
  projectAgent?: Record<string, Agent | 'prompt'>
}

const defaultConfig: Config = {
  defaultAgent: 'prompt',
  globalAgent: 'npm',
  projectAgent: {}
}

let config: Config | undefined

export async function getConfig(): Promise<Config> {
  if (!config) {
    if (!fs.existsSync(rcPath))
      config = defaultConfig
    else
      config = Object.assign({}, defaultConfig, ini.parse(fs.readFileSync(rcPath, 'utf-8')))

    // process packageManager field in package.json
    const result = await findUp('package.json') || ''
    let packageManager = ''
    if (result)
      packageManager = JSON.parse(fs.readFileSync(result, 'utf8')).packageManager ?? ''
    const [, agent, version] = packageManager.match(new RegExp(`^(${Object.values(LOCKS).join('|')})@(\\d).*?$`)) || []
    if (agent)
      Object.assign(config, { defaultAgent: (agent === 'yarn' && Number.parseInt(version) > 1) ? 'yarn@berry' : agent })
  }
  return config
}

type Opt = { projectPath?: string; programmatic?: boolean }
export async function getDefaultAgent(opt: Opt = {}) {
  const { programmatic, projectPath } = opt
  const defaultAgent = await getAgentByProject(projectPath, { isFullMatch: false })
  if (defaultAgent === 'prompt' && (programmatic || process.env.CI))
    return 'npm'
  return defaultAgent
}

export async function getGlobalAgent() {
  const { globalAgent } = await getConfig()
  return globalAgent
}
export async function getAgentByProject(
  projectPath = process.cwd(),
  options?: { isFullMatch?: boolean },
): Promise<Agent | 'prompt'> {
  const {
    projectAgent,
    defaultAgent,
  } = await getConfig()

  const finallyProjectAgent: Record<string, Agent | 'prompt'> = {}

  // replace the variable
  for (const key in projectAgent) {
    let cloneKey = key
    // {ENV} => process.env.ENV
    for (const variable in process.env)
      cloneKey = cloneKey.replace(`{${variable}}`, process.env[variable] || '')

    // filter no-absolute path
    if (path.isAbsolute(cloneKey))
      finallyProjectAgent[cloneKey.replace(/\/$/, '')] = projectAgent[key]
  }

  // find the full match
  if (options?.isFullMatch)
    return finallyProjectAgent[projectPath]

  const matchingKeys = Object.keys(finallyProjectAgent).filter(key =>
    projectPath.startsWith(key)
  ).sort()

  return finallyProjectAgent[matchingKeys[0]] || defaultAgent
}
