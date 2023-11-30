const process = require('process')
const cp = require('child_process')
const path = require('path')

const node = process.execPath
const ip = path.join(__dirname, '..', 'src', 'main.js')

function runTestWithEnv(env) {
  const options = {
    env: {
      ...process.env,
      ...env,
    },
    encoding: 'utf-8',
  }
  const child = cp.spawnSync(node, [ip], options)
  const stdout = child.stdout.toString()
  const encodedResult = stdout.split('::set-output name=result::')[1].trim()
  return JSON.parse(atob(encodedResult))
}

test('test runs', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test 1',
    INPUT_COMMAND: 'echo Hello, World!',
    'INPUT_EXPECTED-OUTPUT': 'Hello, World!',
    'INPUT_COMPARISON-METHOD': 'exact',
  })

  expect(result.status).toBe('pass')
  expect(result.tests[0].name).toBe('Test 1')
  expect(result.tests[0].status).toBe('pass')
  expect(result.tests[0].message).toBe(null)
})

test('contains pre-set environment variables', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test 1',
    INPUT_COMMAND: 'env',
    'INPUT_EXPECTED-OUTPUT': 'Failing on purpose',
    'INPUT_COMPARISON-METHOD': 'exact',
  })

  expect(result.tests[0].message).toContain(`PATH=${process.env.PATH}`)
  expect(result.tests[0].message).toContain('FORCE_COLOR=true')
  expect(result.tests[0].message).toContain('DOTNET_CLI_HOME=/tmp')
  expect(result.tests[0].message).toContain('DOTNET_NOLOGO=true')
  expect(result.tests[0].message).toContain(`HOME=${process.env.HOME}`)
})

test('grants score if test passes', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Max Score Test',
    INPUT_COMMAND: 'echo Hello, World!',
    'INPUT_EXPECTED-OUTPUT': 'Hello, World!',
    'INPUT_COMPARISON-METHOD': 'exact',
    INPUT_TIMEOUT: 10,
    'INPUT_MAX-SCORE': 100,
  })

  expect(result.max_score).toBe(100)
  expect(result.tests[0].score).toBe(100)
})

test('does not grant score if test fails', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Max Score Test Fail',
    INPUT_COMMAND: 'echo Hello, World!',
    'INPUT_EXPECTED-OUTPUT': 'Hello, World!!',
    'INPUT_COMPARISON-METHOD': 'exact',
    INPUT_TIMEOUT: 10,
    'INPUT_MAX-SCORE': 100,
  })

  expect(result.max_score).toBe(100)
  expect(result.tests[0].score).toBe(0)
})

test('outputs error if test-name not provided', () => {
  const result = runTestWithEnv({})

  expect(result.tests[0].message).toContain('Input required and not supplied: test-name')
})

test('outputs error if command is not provided', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test 1',
  })

  expect(result.tests[0].message).toContain('Input required and not supplied: command')
})

test('outputs error if expected-output is not provided', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test 1',
    INPUT_COMMAND: 'echo Hello, World!',
  })

  expect(result.tests[0].message).toContain('Input required and not supplied: expected-output')
})

test('outputs error if comparison-method is not provided', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test 1',
    INPUT_COMMAND: 'echo Hello, World!',
    'INPUT_EXPECTED-OUTPUT': 'Hello, World!',
  })
  expect(result.tests[0].message).toContain('Input required and not supplied: comparison-method')
})

test('throws error for invalid comparison method', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test Invalid Comparison',
    INPUT_COMMAND: 'echo Hello, World!',
    'INPUT_EXPECTED-OUTPUT': 'Hello, World!',
    'INPUT_COMPARISON-METHOD': 'invalid_method',
  })

  expect(result.tests[0].message).toContain('Invalid comparison method: invalid_method')
})

test('handles command timeout correctly', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test Timeout',
    INPUT_COMMAND: 'sleep 3', // This should Timeout
    'INPUT_EXPECTED-OUTPUT': 'beef',
    'INPUT_COMPARISON-METHOD': 'exact',
    INPUT_TIMEOUT: '0.01', // 1 second Timeout
  })

  expect(result.tests[0].status).toBe('error')
  expect(result.tests[0].message).toContain('Command was killed due to timeout')
})

test('checks output', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Checks output',
    INPUT_COMMAND: 'echo "Hello, World"', // This should Timeout
    'INPUT_EXPECTED-OUTPUT': 'beef',
    'INPUT_COMPARISON-METHOD': 'exact',
  })

  expect(result.tests[0].status).toBe('fail')
  expect(result.tests[0].message).toContain('Output does not match expected. Got: Hello, World')
})

test('runs comparison method: exact', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test Exact',
    INPUT_COMMAND: 'echo Hello, World!',
    'INPUT_EXPECTED-OUTPUT': 'Hello, World!',
    'INPUT_COMPARISON-METHOD': 'exact',
  })

  expect(result.tests[0].status).toBe('pass')
  expect(result.tests[0].message).toBe(null)
})

test('runs comparison method: contains', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test Contains',
    INPUT_COMMAND: 'echo Hello, World!',
    'INPUT_EXPECTED-OUTPUT': 'Hello',
    'INPUT_COMPARISON-METHOD': 'contains',
  })

  expect(result.tests[0].status).toBe('pass')
  expect(result.tests[0].message).toBe(null)
})

test('runs comparison method: regex', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test Regex',
    INPUT_COMMAND: 'echo Hello, World!',
    'INPUT_EXPECTED-OUTPUT': 'Hello,\\sWorld!',
    'INPUT_COMPARISON-METHOD': 'regex',
  })

  expect(result.tests[0].status).toBe('pass')
  expect(result.tests[0].message).toBe(null)
})

test('passes input through standard input', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test Input',
    INPUT_COMMAND: 'cat',
    INPUT_INPUT: 'Hello, World!',
    'INPUT_EXPECTED-OUTPUT': 'Hello, World!',
    'INPUT_COMPARISON-METHOD': 'exact',
  })

  expect(result.tests[0].status).toBe('pass')
  expect(result.tests[0].message).toBe(null)
})
