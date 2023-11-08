import { execSync } from "child_process"

const isValidRegExpPattern = (pattern: string) => {
  try {
    return new RegExp(pattern)
  } catch (error) {
    throw new Error(`Invalid RegExp pattern: ${pattern}`)
  }
}

const branchLint = async (validBranches: string) => {
  const branchNamesArr = validBranches.split(/[\s,]+/) || []
  const { red, green, blue, yellow, bold } = (await import("chalk")).default
  const currentBranchName = execSync("git branch --show-current")
    .toString()
    .trim()
  const branchNameValidatingRegex = process.env.BRANCH_NAME_VALIDATING_REGEXP
    ? isValidRegExpPattern(process.env.BRANCH_NAME_VALIDATING_REGEXP)
    : new RegExp(`^(${branchNamesArr.join("|")})[a-z0-9-]*$`)
  let isValidBranch = false

  // + flip `isValidBranch` on valid branch names
  if (branchNameValidatingRegex.test(currentBranchName)) isValidBranch = true

  // + on invalid & no custom regex defined
  if (!isValidBranch && !process.env.BRANCH_NAME_VALIDATING_REGEXP) {
    console.error(
      red(`${bold("Error")}: Invalid branch name. Branch names must be one of:`)
    )

    for (const branchName of branchNamesArr) {
      console.log(`\t- ${blue(branchName)}`)
    }

    console.error(red("or one of the following prefixes:"))

    for (const branchName of branchNamesArr) {
      let message = `\t- ${blue(branchName)}- *`

      if (branchName === "main") {
        message += yellow(" (highly discouraged)")
      }

      console.log(message)
    }

    console.error(
      `${yellow(
        "NB:"
      )} Branch names must be lowercase and can only contain letters, numbers, and dashes.`
    )
    console.log(
      `${blue(
        "If you have any changes in the current working tree, stash them, create a new branch following the convention and apply the stash. Don't forget to delete this local branch."
      )}`
    )
    console.log(
      `\n\n${green("Courtesy: https://www.linkedin.com/in/emranffl")}\n\n`
    )

    process.exit(1)
  }

  // + on invalid & custom regex defined
  if (!isValidBranch && process.env.BRANCH_NAME_VALIDATING_REGEXP) {
    console.error(
      red(
        `${bold(
          "Error"
        )}: Invalid branch name. Branch names must match the following RegExp pattern:`
      )
    )
    console.log(`\t${bold(branchNameValidatingRegex)}`)
    console.log(
      `${blue(
        "Rename the branch adhering the convention or stash the changes in the current working tree, create a new branch following the convention and apply the stash. Don't forget to delete this local branch."
      )}`
    )
    console.log(
      `\n\n${green("Courtesy: https://www.linkedin.com/in/emranffl")}\n\n`
    )

    process.exit(1)
  }

  console.log(green("Branch name adheres to the convention. Proceeding...\n"))
}

export { branchLint }
