import type { RunnerContext } from './runner'
import fs from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import stripJsonComments from 'strip-json-comments'

export function parsePackageJSON(jsonString: string): Record<string, any> {
  /**
   * https://bun.com/blog/bun-v1.1.5#package-json-with-comments-and-trailing-commas
   * Bun allows comments and trailing commas in package.json, so we need to strip them before parsing.
   */
  const cleanJsonString = stripJsonComments(jsonString, { trailingCommas: true })

  return JSON.parse(cleanJsonString)
}

export function getPackageJSON(ctx?: RunnerContext): any {
  const cwd = ctx?.cwd ?? process.cwd()
  const path = resolve(cwd, 'package.json')

  if (fs.existsSync(path)) {
    try {
      const raw = fs.readFileSync(path, 'utf8')
      return parsePackageJSON(raw)
    }
    catch (e) {
      if (!ctx?.programmatic) {
        console.warn('Failed to parse package.json')
        process.exit(1)
      }

      throw e
    }
  }
}
