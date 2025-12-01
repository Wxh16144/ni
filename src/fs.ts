import type { RunnerContext } from './runner'
import fs from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import stripJsonComments from 'strip-json-comments'

export function getPackageJSON(ctx?: RunnerContext): any {
  const cwd = ctx?.cwd ?? process.cwd()
  const path = resolve(cwd, 'package.json')

  if (fs.existsSync(path)) {
    try {
      const jsonString = fs.readFileSync(path, 'utf8')

      /**
       * https://bun.com/blog/bun-v1.1.5#package-json-with-comments-and-trailing-commas
       * Bun allows comments and trailing commas in package.json, so we need to strip them before parsing.
       */
      const cleanJsonString = stripJsonComments(jsonString, { trailingCommas: true })

      const data = JSON.parse(cleanJsonString)
      return data
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
