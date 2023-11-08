import { DotenvParseOutput, config } from "dotenv"
import fs from "fs"
import path from "path"

export interface DotenvParseOutputExtended extends DotenvParseOutput {
  JIRA_BASE_URL: string
  JIRA_PROJECT: string
  JIRA_ISSUE_FILTERS: string
  JIRA_ISSUE_TRANSITION_FILTERS: string
  JIRA_API_USER: string
  JIRA_API_TOKEN: string
}

const envFiles = [".env", ".env.local", ".env.jira.local"]

const configs = {}

console.log(
  "- Environments: ",

  envFiles
    .map((envFile) => {
      const filePath = path.resolve(envFile)

      // check if the file exists before attempting to load it
      if (fs.existsSync(filePath)) {
        const result = config({ path: filePath })

        if (result.error) {
          console.error(`Error parsing ${envFile}:`, result.error)
          return
        }

        Object.assign(configs, result.parsed)
        return envFile
      }

      // console.log(`Could not find ${envFile}`)
      return
    })
    .filter(Boolean)
    .join(", "),
  "\n"
)

// console.log("Merged Configuration:", configs)
