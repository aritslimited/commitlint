const LimitedInputPrompt = async () => {
  const InquirerInputPrompt = await import(
    "inquirer/lib/prompts/input.js"
  ).then((m) => m.default)

  class InputPrompt extends InquirerInputPrompt {
    constructor(...args: any) {
      // @ts-expect-error
      super(...args)

      // @ts-expect-error
      if (!this.opt.maxLength) {
        this.throwParamError("maxLength")
      }
      // @ts-expect-error
      this.originalMessage = this.opt.message
      // @ts-expect-error
      this.spacer = new Array(this.opt.maxLength).fill("-").join("")

      // @ts-expect-error
      if (this.opt.leadingLabel) {
        // @ts-expect-error
        if (typeof this.opt.leadingLabel === "function") {
          // @ts-expect-error
          this.leadingLabel = " " + this.opt.leadingLabel(this.answers)
        } else {
          // @ts-expect-error
          this.leadingLabel = " " + this.opt.leadingLabel
        }
      } else {
        // @ts-expect-error
        this.leadingLabel = ""
      }

      // @ts-expect-error
      this.leadingLength = this.leadingLabel.length
    }

    remainingChar() {
      // @ts-expect-error
      return this.opt.maxLength - this.leadingLength - this.rl.line.length
    }

    onKeypress() {
      // @ts-expect-error
      if (this.rl.line.length > this.opt.maxLength - this.leadingLength) {
        // @ts-expect-error
        this.rl.line = this.rl.line.slice(
          0,
          // @ts-expect-error
          this.opt.maxLength - this.leadingLength
        )
        // @ts-expect-error
        this.rl.cursor--
      }

      this.render()
    }

    getCharsLeftText() {
      const chars = this.remainingChar()

      if (chars > 1) {
        return `${chars} chars left`
      } else {
        return `${chars} char left`
      }
    }

    // @ts-expect-error
    render(error = null) {
      let bottomContent = ""
      let message = this.getQuestion()
      let appendContent = ""
      const isFinal = this.status === "answered"

      if (isFinal) {
        appendContent = this.answer
      } else {
        appendContent = this.rl.line
      }

      // @ts-expect-error
      message = `${message} [${this.spacer}] ${this.getCharsLeftText()} 
${
  // @ts-expect-error
  this.leadingLabel
} ${appendContent}`

      if (error) {
        bottomContent = ">> " + error
      }

      this.screen.render(message, bottomContent)
    }
  }

  return InputPrompt
}

export { LimitedInputPrompt }
