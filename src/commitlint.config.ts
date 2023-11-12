import "./dotenv.config.js"
import { execSync } from "child_process"
import { DotenvParseOutputExtended } from "./dotenv.config.js"
import { branchLint } from "./branchlint.config.js"
import { LimitedInputPrompt } from "./Components/LimitedInputPrompt"

const requiredEnvVariables = [
  "JIRA_BASE_URL", // e.g. "https://jira.example.com/rest/api/2"
  "JIRA_PROJECT",
  "JIRA_ISSUE_FILTERS",
  "JIRA_ISSUE_TRANSITION_FILTERS",
  "JIRA_API_USER",
  "JIRA_API_TOKEN",
] as const
const { ...env } = Object.fromEntries(
  requiredEnvVariables.map((varName) => {
    const value = process.env[varName]

    // * throw error if required environment variable is not found
    if (value === undefined) {
      throw new Error(`Environment variable '${varName}' is not defined.`)
    }
    return [varName, value]
  })
) as DotenvParseOutputExtended

interface JiraIssueResponse {
  id: string
  key: string
  fields: {
    priority: {
      name: string
    }
    issuetype: {
      name: string
    }
    summary: string
  }
}
const MAX_SUMMARY_LENGTH = 50
const MAX_TITLE_WIDTH = 120
const base64Credentials = Buffer.from(
  `${env.JIRA_API_USER}:${env.JIRA_API_TOKEN}`
).toString("base64")

// + function to fetch Jira issues
const fetchJiraIssues = async (): Promise<
  { value?: string; priority?: string; name: string; id?: string }[]
> => {
  const status = env.JIRA_ISSUE_FILTERS.split(", ")
    .map((e) => `"${e.replace(/\[|\]/g, "")}"`)
    .join(", ")
  const jqlQuery = `project = "${env.JIRA_PROJECT}" AND status IN (${status}) AND assignee = currentUser() ORDER BY updated DESC`
  const jiraIssues: {
    value?: string
    name: string
  }[] = [
    { value: undefined, name: "Undefined issue! Task first, commit next!" },
  ]

  try {
    const response = await fetch(
      `${env.JIRA_BASE_URL}/search?jql=${encodeURIComponent(jqlQuery)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${base64Credentials}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    )

    if (response.ok) {
      const { issues } = await response.json()

      if (issues) {
        jiraIssues.unshift(
          issues.map((issue: JiraIssueResponse) => ({
            value: issue.key,
            priority: issue.fields.priority.name,
            name: `${issue.key} — ${issue.fields.issuetype.name} [${
              issue.fields.priority.name
            }]: ${
              issue.fields.summary.length > MAX_SUMMARY_LENGTH
                ? issue.fields.summary.slice(0, MAX_SUMMARY_LENGTH) + "..."
                : issue.fields.summary
            }`,
            id: issue.id,
          }))
        )
        return jiraIssues.flat()
      }
    }

    throw new Error(`Error fetching Jira issues: ${response.status}`)
  } catch (error) {
    console.error(error)
  }

  return jiraIssues
}
// + function to fetch Jira issue transitions
const fetchJiraIssueTransitions = async (
  jiraIssueKey?: string
): Promise<
  {
    value?: string
    name: string
  }[]
> => {
  const jiraIssueTransitionFilters = env.JIRA_ISSUE_TRANSITION_FILTERS.split(
    ", "
  ).map((e) => e.replace(/\[|\]/g, ""))
  const jiraIssueTransitions: {
    value?: string
    name: string
  }[] = [{ value: undefined, name: "Keep issue status unchanged!" }]

  try {
    const response = await fetch(
      `${env.JIRA_BASE_URL}/issue/${jiraIssueKey}/transitions`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${base64Credentials}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    )

    if (response.ok) {
      const { transitions } = await response.json()

      if (transitions) {
        const transition = transitions.map(
          (transition: {
            id: string
            name: string
            to: { self: { name: string }; name: string }
          }) => {
            if (jiraIssueTransitionFilters.includes(transition.name)) {
              return {
                value: transition.id,
                name: `${transition.name} [${
                  transition.to.self.name ?? transition.to.name
                }]`,
              }
            }
            return null
          }
        )

        jiraIssueTransitions.unshift(transition.filter(Boolean))
        return jiraIssueTransitions.flat()
      }
    }

    throw new Error(`Error fetching Jira issue transitions: ${response.status}`)
  } catch (error) {
    console.error(error)
  }

  return jiraIssueTransitions
}
// + function to update Jira issue status
const updateJiraIssueStatus = async (
  jiraIssueKey: string,
  transitionId: string
) => {
  const { green } = (await import("chalk")).default

  const response = await fetch(
    `${env.JIRA_BASE_URL}/issue/${jiraIssueKey}/transitions`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${base64Credentials}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        transition: {
          id: transitionId,
        },
      }),
    }
  )

  if (response.ok) {
    return green("\t✓ Issue status updated successfully!")
  }

  throw new Error(
    `Error updating Jira issue status for ${jiraIssueKey}: ${response.status}`
  )
}
// + function to update Jira issue time tracking
const updateJiraIssueTimeTracking = async (
  jiraIssueKey: string,
  timeSpent: string
) => {
  const { green } = (await import("chalk")).default

  const response = await fetch(
    `${env.JIRA_BASE_URL}/issue/${jiraIssueKey}/worklog`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${base64Credentials}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        timeSpent,
      }),
    }
  )

  if (response.ok) {
    return green("\t✓ Work log updated successfully!")
  }

  throw new Error(
    `Error updating Jira issue time tracking for ${jiraIssueKey}: ${response.status}`
  )
}
// * function to handle Jira issue updates
const handleUpdateJiraIssue = async (
  JIRA_ISSUE_KEYS: (string | undefined)[],
  ISSUE_TRANSITION_IDs: Record<string, string>,
  TIME_TO_ACCOMPLISH_TASKS: Record<string, string>
) => {
  const { blue } = (await import("chalk")).default

  JIRA_ISSUE_KEYS.filter(Boolean).map(async (jiraIssueKey?: string) => {
    if (
      jiraIssueKey !== undefined &&
      Object.keys(ISSUE_TRANSITION_IDs).includes(jiraIssueKey) &&
      Object.keys(TIME_TO_ACCOMPLISH_TASKS).includes(jiraIssueKey)
    ) {
      console.log(
        `\nUpdating status & work log of ${blue(jiraIssueKey)}...\n`,

        await updateJiraIssueStatus(
          jiraIssueKey,
          ISSUE_TRANSITION_IDs[
            jiraIssueKey as keyof typeof ISSUE_TRANSITION_IDs
          ]!
        ),
        "\n",
        await updateJiraIssueTimeTracking(
          jiraIssueKey,
          TIME_TO_ACCOMPLISH_TASKS[
            jiraIssueKey as keyof typeof TIME_TO_ACCOMPLISH_TASKS
          ]!
        )
      )

      // try {
      //   const [statusUpdateResponse, workLogUpdateResponse] = await Promise.allSettled([
      //     updateJiraIssueStatus(
      //       jiraIssueKey,
      //       ISSUE_TRANSITION_IDs[jiraIssueKey as keyof typeof ISSUE_TRANSITION_IDs]!
      //     ),
      //     updateJiraIssueTimeTracking(
      //       jiraIssueKey,
      //       TIME_TO_ACCOMPLISH_TASKS[jiraIssueKey as keyof typeof TIME_TO_ACCOMPLISH_TASKS]!
      //     ),
      //   ])

      //   console.log(`\t✓ ${green(statusUpdateResponse)}`)
      //   console.log(`\t✓ ${green(workLogUpdateResponse)}\n`)
      // } catch (error) {
      //   console.error(error)
      // }
    }
  })
}
import("inquirer/lib/prompts/input.js").then((m) => m.default)
const prompter = async (cz: any, commit: any) => {
  // * lint the branch name if VALID_BRANCH_NAMES is defined
  process.env.VALID_BRANCH_NAMES &&
    (await branchLint(process.env.VALID_BRANCH_NAMES))

  // * register the custom prompt
  cz.registerPrompt("limitedInput", await LimitedInputPrompt())

  const binaryChoices = [
    { value: true, name: "Yes" },
    { value: false, name: "No" },
  ]
  // valid branch names modifier function
  const validBranchNames = (validBranchNameString: string) =>
    validBranchNameString.split(/ /g).map((branch) => {
      branch = branch.replace(/[-_]/g, " ")
      return branch
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    })
  const multiChoiceSteps = {
    commitTypes: {
      question: "Select the type of update that you're committing:",
      choices: [
        { value: "feat", name: "feat:     A new feature" },
        { value: "fix", name: "fix:      A bug fix" },
        {
          value: "chore",
          name: "chore:    Continuation of an incomplete feature/other changes",
        },
        { value: "docs", name: "docs:     Documentation only changes" },
        { value: "style", name: "style:    CSS style changes" },
        {
          value: "refactor",
          name: "refactor: A code update that neither fixes a bug nor adds a feature",
        },
        {
          value: "perf",
          name: "perf:     A code update that improves performance",
        },
        { value: "test", name: "test:     Adding test script" },
        {
          value: "build",
          name: "build:    Changes that affect the build system or external dependencies",
        },
        {
          value: "ci",
          name: "ci:       Changes that affect the continuous integration system",
        },
        { value: "revert", name: "revert:   Reverts a previous commit" },
      ],
    },
    jiraIssueKeys: {
      question: "Select the Jira issue key(s) that you're committing:",
      choices: await fetchJiraIssues(),
    },
    commitScopes: {
      question: "Select the scope of your changes:",
      choices: process.env.VALID_BRANCH_NAMES
        ? process.env.VALID_BRANCH_NAMES.split(/[\s,]+/).map((validBranch) => {
            return {
              value: validBranch,
              name: validBranchNames(validBranch),
            }
          })
        : execSync(`git for-each-ref --format="%(refname:short)" refs/heads/`)
            .toString()
            .trim()
            .split("\n")
            .map((vb) => {
              return {
                value: vb,
                name: validBranchNames(vb),
              }
            }),
    },
    isBreakingUpdate: {
      question: "Are there any breaking changes?",
      choices: binaryChoices,
    },
    commitConfirmation: {
      question: "Are you sure you want to proceed with the commit?",
      choices: binaryChoices,
    },
    pushCommitConfirmation: {
      question: "Do you want to push the commit to remote?",
      choices: binaryChoices,
    },
  } as const
  const getFormattedTitlePrefix = ({
    type,
    scope,
    isBreaking,
    jiraIssueKey,
  }: {
    type: (typeof multiChoiceSteps.commitTypes.choices)[number]["value"]
    scope: (typeof multiChoiceSteps.commitScopes.choices)[number]["value"]
    isBreaking?: (typeof multiChoiceSteps.isBreakingUpdate.choices)[number]["value"]
    jiraIssueKey?: (typeof multiChoiceSteps.jiraIssueKeys.choices)[number]["value"][]
  }) => `${type}(${scope})${isBreaking ? "!" : ""}: `
  const jiraIssueTransitions: any = {}

  // + prompt for commit type and Jira issue key
  const {
    COMMIT_TYPE,
    JIRA_ISSUE_KEYS,
  }: {
    COMMIT_TYPE: (typeof multiChoiceSteps.commitTypes.choices)[number]["value"]
    JIRA_ISSUE_KEYS?: (typeof multiChoiceSteps.jiraIssueKeys.choices)[number]["value"][]
  } = await cz.prompt([
    {
      type: "list",
      name: "COMMIT_TYPE",
      message: multiChoiceSteps.commitTypes.question,
      choices: multiChoiceSteps.commitTypes.choices,
      when: true,
      default: multiChoiceSteps.commitTypes.choices.find(
        (choice) => choice.value === "chore"
      )?.value,
      pageSize: 15,
    },
    {
      type: "checkbox",
      name: "JIRA_ISSUE_KEYS",
      message: multiChoiceSteps.jiraIssueKeys.question,
      when: ({
        COMMIT_TYPE,
      }: {
        COMMIT_TYPE: (typeof multiChoiceSteps.commitTypes.choices)[number]["value"]
      }) => {
        return (
          COMMIT_TYPE !== "build" &&
          COMMIT_TYPE !== "ci" &&
          COMMIT_TYPE !== "revert"
        )
      },
      choices: multiChoiceSteps.jiraIssueKeys.choices,
      validate: (input: unknown[]) => {
        if (input.length < 1) return "You must select at least one issue key"
        return true
      },
    },
  ])

  if (JIRA_ISSUE_KEYS && JIRA_ISSUE_KEYS.length > 0) {
    JIRA_ISSUE_KEYS.filter(Boolean).map(async (jiraIssueKey?: string) => {
      Object.assign(jiraIssueTransitions, {
        [jiraIssueKey!]: await fetchJiraIssueTransitions(jiraIssueKey),
      })
    })
  }

  // + prompt for time taken to accomplish tasks
  const {
    ...TIME_TO_ACCOMPLISH_TASKS
  }:
    | {
        [key: string]: string
      }
    | undefined = await cz.prompt(
    JIRA_ISSUE_KEYS && JIRA_ISSUE_KEYS.length > 0
      ? JIRA_ISSUE_KEYS.filter(Boolean).map((jiraIssueKey?: string) => ({
          type: "input",
          name: `${jiraIssueKey}`,
          message: `Time taken for ${jiraIssueKey} (required):\n`,
          suffix: "{1w 2d 3h 4m}",
          when: ({
            COMMIT_TYPE,
          }: {
            COMMIT_TYPE: (typeof multiChoiceSteps.commitTypes.choices)[number]["value"]
          }) => {
            return (
              COMMIT_TYPE !== "build" &&
              COMMIT_TYPE !== "ci" &&
              COMMIT_TYPE !== "revert"
            )
          },
          validate(input: string): boolean | string {
            if (input.length < 2) {
              return `The time must have at least ${2} characters`
            }

            const unitOrder = { w: 1, d: 2, h: 3, m: 4 }
            const units = input.match(/\d+[wdhm]/g)

            if (!units || units?.length === 0) {
              return "The time must contain at least one unit (w, d, h, m)"
            }

            const seenUnits = new Set<string>()
            let prevUnitOrder = 0

            for (const unit of units) {
              const unitType = unit.charAt(unit.length - 1)
              const unitValue = parseInt(unit, 10)

              if (unitValue === 0) {
                return "The time must not contain leading zero values"
              }

              if (seenUnits.has(unitType)) {
                return "The time must not contain duplicate units"
              }

              if (
                unitOrder[unitType as keyof typeof unitOrder] <= prevUnitOrder
              ) {
                return "The time must be in descending order of units"
              }

              seenUnits.add(unitType)
              prevUnitOrder = unitOrder[unitType as keyof typeof unitOrder]
            }

            // valid time
            return true
          },
          filter(time: string): string {
            const units = time.match(/\d+[wdhm]/g)

            if (!units || units?.length === 0) {
              throw Error("Invalid time format")
            }

            // valid time
            return units.join(" ")
          },
        }))
      : []
  )

  // + prompt for Jira issue transition
  const {
    ...ISSUE_TRANSITION_IDs
  }:
    | {
        [key: string]: string
      }
    | undefined = await cz.prompt(
    JIRA_ISSUE_KEYS && JIRA_ISSUE_KEYS.length > 0
      ? JIRA_ISSUE_KEYS.filter(Boolean).map((jiraIssueKey?: string) => ({
          type: "list",
          name: `${jiraIssueKey}`,
          message: `Update status of ${jiraIssueKey} to:`,
          choices: jiraIssueTransitions[jiraIssueKey!],
          default: 0,
        }))
      : []
  )

  // + prompt for commit scope, title, body, etc.
  const {
    COMMIT_SCOPE,
    COMMIT_TITLE,
    COMMIT_BODY,
    IS_BREAKING_UPDATE,
  }: {
    COMMIT_SCOPE: (typeof multiChoiceSteps.commitScopes.choices)[number]["value"]
    COMMIT_TITLE: string
    COMMIT_BODY: string
    IS_BREAKING_UPDATE?: (typeof multiChoiceSteps.isBreakingUpdate.choices)[number]["value"]
  } = await cz.prompt([
    {
      type: "list",
      name: "COMMIT_SCOPE",
      message: multiChoiceSteps.commitScopes.question,
      choices: multiChoiceSteps.commitScopes.choices,
      when: true,
      default: () => {
        const currentBranch = execSync("git branch --show-current")
          .toString()
          .trim()
        const defaultSelectedIndex =
          multiChoiceSteps.commitScopes.choices.findIndex((choice) =>
            currentBranch.includes(choice.value)
          )

        if (defaultSelectedIndex !== -1) {
          return defaultSelectedIndex
        }

        return 0
      },
    },
    {
      type: "list",
      name: "IS_BREAKING_UPDATE",
      message: multiChoiceSteps.isBreakingUpdate.question,
      choices: multiChoiceSteps.isBreakingUpdate.choices,
      when: ({
        COMMIT_TYPE,
      }: {
        COMMIT_TYPE: (typeof multiChoiceSteps.commitTypes.choices)[number]["value"]
      }) => {
        return (
          COMMIT_TYPE !== "build" &&
          COMMIT_TYPE !== "ci" &&
          COMMIT_TYPE !== "revert"
        )
      },
      default: multiChoiceSteps.isBreakingUpdate.choices.find(
        (choice) => !choice.value
      )?.value,
    },
    {
      type: "limitedInput",
      name: "COMMIT_TITLE",
      message:
        "Commit title — a short, imperative tense description (required):\n",
      when: true,
      maxLength: MAX_TITLE_WIDTH,
      leadingLabel: ({
        COMMIT_SCOPE,
        IS_BREAKING_UPDATE,
      }: {
        COMMIT_SCOPE: (typeof multiChoiceSteps.commitScopes.choices)[number]["value"]
        IS_BREAKING_UPDATE: (typeof multiChoiceSteps.isBreakingUpdate.choices)[number]["value"]
      }) => {
        return getFormattedTitlePrefix({
          type: COMMIT_TYPE,
          scope: COMMIT_SCOPE,
          isBreaking: IS_BREAKING_UPDATE,
          jiraIssueKey: JIRA_ISSUE_KEYS,
        })
      },
      validate: (input: string) =>
        input.length >= 5 || `The title must have at least ${5} characters`,
      filter: (title: string) => {
        title = title.trim()
        // remove trailing whitespace
        title = title.replace(/\s+$/, "")
        return title
      },
    },
    {
      type: "editor",
      name: "COMMIT_BODY",
      message: ({
        IS_BREAKING_UPDATE,
      }: {
        IS_BREAKING_UPDATE: (typeof multiChoiceSteps.isBreakingUpdate.choices)[number]["value"]
      }) => {
        return IS_BREAKING_UPDATE
          ? "Provide a longer description of the breaking changes: (press Enter, write, then [Esc] + [:] + [wq] to save)\n"
          : "Provide a longer description: (press Enter, then [Esc] + [:] + [q] to skip)\n"
      },
      when: ({
        COMMIT_TYPE,
        IS_BREAKING_UPDATE,
      }: {
        COMMIT_TYPE: (typeof multiChoiceSteps.commitTypes.choices)[number]["value"]
        IS_BREAKING_UPDATE: (typeof multiChoiceSteps.isBreakingUpdate.choices)[number]["value"]
      }) => {
        return (
          (COMMIT_TYPE !== "build" &&
            COMMIT_TYPE !== "ci" &&
            COMMIT_TYPE !== "revert") ||
          IS_BREAKING_UPDATE
        )
      },
      validate: (
        input: string,
        { IS_BREAKING_UPDATE }: { IS_BREAKING_UPDATE: boolean }
      ) => {
        if (IS_BREAKING_UPDATE) {
          return (
            input.length >= 10 || `The body must have at least ${10} characters`
          )
        }
        return true
      },
      filter: (body: string) => {
        body = body.trim()
        // while (body.length >= 10 && !body.endsWith(".")) {
        //   body += "."
        // }
        return body.length > 0 ? body : ""
      },
    },
  ])

  // * construct the commit message
  const bodyString = COMMIT_BODY?.length
    ? `\n\n\n${IS_BREAKING_UPDATE ? "BREAKING CHANGE:" : "DESCRIPTION:"}\n` +
      COMMIT_BODY +
      "\n"
    : "\n\n\n"
  const contentModificationsString = `CONTENT MODIFICATIONS:\n${execSync(
    "git diff --cached --name-status"
  )
    .toString()
    .split("\n")
    .map((line) => `\t${line.trim()}`)
    .join("\n")}`
  const timeString = Object.keys(TIME_TO_ACCOMPLISH_TASKS).length
    ? `\nTIME:\n${Object.entries(TIME_TO_ACCOMPLISH_TASKS)
        .map(
          ([jiraIssueKey, time]: [string, unknown], index: number) =>
            `\t${jiraIssueKey}\t[${time}]`
        )
        .join("\n")}`
    : ""

  // * final commit message
  const commitMessage =
    `${getFormattedTitlePrefix({
      type: COMMIT_TYPE,
      scope: COMMIT_SCOPE,
      isBreaking: IS_BREAKING_UPDATE,
      jiraIssueKey: JIRA_ISSUE_KEYS,
    })}${COMMIT_TITLE}` +
    bodyString +
    contentModificationsString +
    timeString

  // * boxen configuration
  const boxen = (await import("boxen")).default
  const boxenOptions = {
    padding: 1,
    margin: 1,
    title: "Commit Message Preview",
    titleAlignment: "center",
    borderColor: "yellow",
    borderStyle: {
      topLeft: "",
      topRight: "",
      bottomLeft: "",
      bottomRight: "",
      top: "-",
      bottom: "-",
      left: "",
      right: "",
    },
    float: "center",
  } as const

  // * log the commit message
  console.log(boxen(commitMessage.trim(), boxenOptions))

  const { confirm } = await cz.prompt([
    {
      type: "list",
      name: "confirm",
      message: multiChoiceSteps.commitConfirmation.question,
      choices: multiChoiceSteps.commitConfirmation.choices,
      default: true,
    },
  ])

  if (!confirm) process.exit(1)
  else {
    // + commit the changes
    commit(commitMessage.trim())

    // + update Jira issue status
    if (JIRA_ISSUE_KEYS && ISSUE_TRANSITION_IDs && TIME_TO_ACCOMPLISH_TASKS) {
      await handleUpdateJiraIssue(
        JIRA_ISSUE_KEYS,
        ISSUE_TRANSITION_IDs,
        TIME_TO_ACCOMPLISH_TASKS
      )
    }

    // process.exit(0)

    // setTimeout(async () => {
    //   // + prompt for pushing commit to remote
    //   const { pushCommitConfirmation } = await cz.prompt([
    //     {
    //       type: "list",
    //       name: "pushCommitConfirmation",
    //       message: multiChoiceSteps.pushCommitConfirmation.question,
    //       choices: multiChoiceSteps.pushCommitConfirmation.choices,
    //       default: false,
    //     },
    //   ])

    //   if (!pushCommitConfirmation) process.exit(1)

    //   const { green } = (await import("chalk")).default

    //   console.log(green("\nPushing commit to remote...\n"))

    //   execSync("git push")
    //   process.exit(0)
    // }, 2000)
  }
}

export default { prompter }
