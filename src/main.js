const {execSync} = require('child_process')
const core = require('@actions/core')

const env = {
  PATH: process.env.PATH,
  FORCE_COLOR: 'true',
  DOTNET_CLI_HOME: '/tmp',
  DOTNET_NOLOGO: 'true',
  HOME: process.env.HOME,
}

function getInputs() {
  const testName = core.getInput('test-name', {
    required: true,
  })
  const setupCommand = core.getInput('setup-command')
  const command = core.getInput('command', {
    required: true,
  })
  const input = core.getInput('input').trim()
  const expectedOutput = core.getInput('expected-output', {
    required: true,
  })
  const comparisonMethod = core.getInput('comparison-method', {
    required: true,
  })
  const timeout = parseFloat(core.getInput('timeout') || 10) * 60000 // Convert to minutes

  const maxScore = parseInt(core.getInput('max-score') || 0)

  if (!['exact', 'contains', 'regex'].includes(comparisonMethod)) {
    throw new Error(`Invalid comparison method: ${comparisonMethod}`)
  }

  if (!testName || !command || !expectedOutput || !comparisonMethod) {
    throw new Error('Required inputs are missing or invalid')
  }

  return {
    testName,
    setupCommand,
    command,
    input,
    expectedOutput,
    comparisonMethod,
    timeout,
    maxScore,
  }
}

function executeTest(command, input, timeout) {
  try {
    const output = execSync(command, {
      input,
      timeout,
      env
    })
      .toString()
      .trim()
    return {
      output,
    }
  } catch (e) {
    const message = e.message.includes('ETIMEDOUT') ? 'Command was killed due to timeout' : e.message
    return {
      error: message,
    }
  }
}

function compareOutput(output, expected, method) {
  switch (method) {
    case 'exact':
      return output === expected
    case 'contains':
      return output.includes(expected)
    case 'regex': {
      const regex = new RegExp(expected)
      return regex.test(output)
    }
    default:
      throw new Error(`Invalid comparison method: ${method}`)
  }
}

function run() {
  let inputs = {}

  try {
    inputs = getInputs()

    if (inputs.setupCommand) {
      execSync(inputs.setupCommand, {
        timeout: inputs.timeout,
        stdio: 'ignore',
        env,

      })
    }

    const startTime = new Date()
    const {output, error} = executeTest(inputs.command, inputs.input, inputs.timeout)
    const endTime = new Date()

    let status = 'pass'
    let message = null
    let score = inputs.maxScore

    if (error) {
      status = 'error'
      message = error
      score = 0
    } else if (!compareOutput(output, inputs.expectedOutput, inputs.comparisonMethod)) {
      status = 'fail'
      message = `Output does not match expected. Got: ${output}`
      score = 0
    }

    const result = {
      version: 1,
      status,
      max_score: inputs.maxScore,
      tests: [
        {
          name: inputs.testName,
          status,
          message,
          test_code: `${inputs.command} <stdin>${inputs.input}`,
          filename: '',
          line_no: 0,
          execution_time: `${(endTime - startTime) / 1000}s`,
          score,
        },
      ],
    }

    core.setOutput('result', btoa(JSON.stringify(result)))
  } catch (error) {
    const result = {
      version: 1,
      status: 'error',
      tests: [
        {
          name: inputs.testName || 'Unknown Test',
          status: 'error',
          message: error.message,
          test_code: `${inputs.command || 'Unknown Command'} <stdin>${inputs.input || ''}`,
          filename: '',
          line_no: 0,
          execution_time: 0,
        },
      ],
    }

    core.setOutput('result', btoa(JSON.stringify(result)))
  }
}

function btoa(str) {
  return Buffer.from(str).toString('base64')
}

run()
