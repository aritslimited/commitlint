# @aritslimited/commitlint

A commit linting [commitizen](https://www.npmjs.com/package/commitizen?activeTab=readme) adapter & branch naming convention tool tailored for [ARITS Limited](https://www.aritsltd.com/) with Jira Issue & Project Tracking Software; to track commits to Jira issues and transition them to the next stage of development workflow automatically.

![npm (scoped)](https://img.shields.io/npm/v/%40aritslimited/commitlint?logo=npm&color=blue&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F%40aritslimited%2Fcommitlint)
[![npm downloads](https://img.shields.io/npm/dm/%40aritslimited%2Fcommitlint)](http://npm-stat.com/charts.html?package=@aritslimited/commitlint&from=2023-11-01)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
![Libraries.io dependency status for latest release](https://img.shields.io/librariesio/release/npm/%40aritslimited%2Fcommitlint)
![GitHub Actions/CI](https://github.com/aritslimited/commitlint/workflows/Node.js%20CI/badge.svg)
![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/aritslimited/commitlint/.github%2Fworkflows%2Frelease.yml)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
![GitHub](https://img.shields.io/github/license/aritslimited/commitlint)
![GitHub repo size](https://img.shields.io/github/repo-size/aritslimited/commitlint)
![GitHub last commit](https://img.shields.io/github/last-commit/aritslimited/commitlint)

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Must Have Environment Variables](#must-have-environment-variables)
  - [Branch Naming Convention](#branch-naming-convention)
- [License](#license)

## Installation

You can install this package via npm or yarn. To install, run the following command:

```bash
npm install --save-dev @aritslimited/commitlint commitizen boxen chalk dotenv inquirer node-fetch tslib
```

or

```bash
yarn add -D @aritslimited/commitlint commitizen boxen chalk dotenv inquirer node-fetch tslib
```

or

```bash
pnpm add -D @aritslimited/commitlint commitizen boxen chalk dotenv inquirer node-fetch tslib
```

or

```bash
bun add -D @aritslimited/commitlint commitizen boxen chalk dotenv inquirer node-fetch tslib
```

## Configuration

Run the following command **from project root** to start using this commitizen adapter along with commitizen:

```bash
echo "{\"path\": \"@aritslimited/commitlint/dist/commitlint.config.js\"}" > ./.czrc
```

Now, you can run the following command to commit your changes:

```bash
npx cz
```

or create a script in your `package.json` file and use it with `npm run commit` or `yarn commit` or `pnpm commit` or `bun commit`:

```json
{
  "scripts": {
    "commit": "npx cz"
  }
}
```

## Usage

This package supports the following environment files out of the box:

- .env
- .env.local
- .env.jira.local

### Must Have Environment Variables

This package requires the following environment variables to be set in any of the environment files mentioned above that are synced with your version control system (preferably **.env**):

- `JIRA_BASE_URL`=https://aritsltd.atlassian.net/rest/api/2
- `JIRA_PROJECT`=_your Jira project key_ # e.g. TAF
- `JIRA_ISSUE_FILTERS`=_your Jira issue filters_ # e.g. "In Progress"
- `JIRA_ISSUE_TRANSITION_FILTERS`=_your Jira issue transition filters_ # e.g. "Send to QA"

and the following environment variables to be set in any of the environment files mentioned above that are **not** synced with your version control system (preferably **.env.local**):

- `JIRA_API_USER`=_your Jira API user email_
- `JIRA_API_TOKEN`=_your Jira API token_ # [How to generate a Jira API token](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/)

### Branch Naming Convention

This package also provides a branch naming convention tool. To use it, include the following environment variables in any of the environment files mentioned above that are synced with your version control system (preferably **.env**):

- `VALID_BRANCH_NAMES`=_your string of valid branch names separated by space_ # e.g. "main staging dev ui"

> NB: Branch naming convention tool is optional feature that is **disabled** by default. To enable it, the `VALID_BRANCH_NAMES` environment variable(s) must be set.

- `BRANCH_NAME_VALIDATING_REGEXP`=_your branch name validating regular expression_ # e.g. "^(main|staging|dev|ui)\/[A-Z]{2,3}-[0-9]{1,5}\/[a-z0-9-]+$"

`BRANCH_NAME_VALIDATING_REGEXP` is optional. Default validating regex expression is:

```js
new RegExp(`^(${branchNamesArr.join("|")})[a-z0-9-]*$`)
```

You can validate your regular expression [here](https://regexr.com/).

## License

This package is open source and available under the [MIT License](LICENSE).

## Contributors

| Name                       | Contact                                      |
|----------------------------|----------------------------------------------|
| **Emran Hossain**          | [![GitHub](https://img.shields.io/badge/@emranffl-grey?logo=github)](https://github.com/emranffl) [![LinkedIn](https://img.shields.io/badge/@emranffl-blue?logo=linkedin)](https://www.linkedin.com/in/emranffl/) |
