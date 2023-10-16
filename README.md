## GitHub Classroom Autograding IO Test Runner

### Overview
**Autograding IO Test Runner** is a plugin for GitHub Classroom's Autograder. Use it to ensure student executables output the correct values on tests.

### Key Features
- **Automatic Grading**: Test student code submissions and provide immediate feedback.
- **Customizable Test Setup**: Define pre-test setup commands and specific testing commands.
- **Flexible Output Comparison**: Supports multiple methods to compare the stdout output.
- **Timeout Control**: Limit the runtime of tests to prevent excessive resource usage.

### Inputs

| Input Name | Description | Required |
|------------|-------------|----------|
| `test-name` | Name of the test. | Yes |
| `setup-command` | A command that runs before the test. Useful for setting up the environment or dependencies. | No |
| `command` | The main command to run for testing. A zero exit code indicates a passed test and grants points. | Yes |
| `input` | The input data that will be passed to the command via stdin. | Yes |
| `expected-output` | The expected output that the command should print to stdout. | Yes |
| `comparison-method` | Defines how the stdout output will be compared. Supported values are `included`, `exact`, and `regex`. | Yes |
| `timeout` | Specifies the time limit (in minutes) for the test to run. The maximum allowed value is 60 minutes. Defaults to 10 minutes if not specified. | No |

### Outputs

| Output Name | Description |
|-------------|-------------|
| `result` | Outputs the result of the runner, indicating the success or failure of the test. |

### Usage

1. Add the GitHub Classroom Autograding IO Test Runner action to your workflow.

```yaml
name: Autograding Tests

on:
  push

jobs:
  run-tests:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v2
    - name: Run Autograding Tests
      uses: education/autograding-io-test-runner@v1
      with:
        test-name: 'Test Name'
        command: './bin/shout'
        input: 'hello'
        expected-output: 'HELLO'
        comparison-method: 'exact'
    - name: Autograding Reporter
      uses: ...
