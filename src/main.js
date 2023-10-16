// src/index.js

const {
    execSync
} = require('child_process');
const core = require('@actions/core');

function run() {
    let testName;
    let command;
    let input;

    try {
        // Parse Inputs
        testName = core.getInput('test-name', {
            required: true
        });
        const setupCommand = core.getInput('setup-command');
        command = core.getInput('command', {
            required: true
        });
        input = core.getInput('input').trim();
        const expectedOutput = core.getInput('expected-output', {
            required: true
        });
        const comparisonMethod = core.getInput('comparison-method', {
            required: true
        });

        if (!['exact', 'contains', 'regex'].includes(comparisonMethod)) {
            throw new Error(`Invalid comparison method: ${comparisonMethod}`);
        }

        const timeout = parseInt(core.getInput('timeout', {
            required: true
        })) * 1000; // Convert to ms

        if (!testName || !command || !expectedOutput || !comparisonMethod, !timeout) {
            throw new Error("Required inputs are missing or invalid");
        }

        // Setup Phase
        if (setupCommand) {
            execSync(setupCommand, {
                timeout,
                stdio: 'ignore'
            });
        }

        // Test Execution
        let output;
        let error;
        let status = 'pass';
        let message = null;
        const startTime = new Date();
        let endTime;

        try {
            output = execSync(command, {
                input,
                timeout
            }).toString().trim();
            endTime = new Date();
        } catch (e) {
            error = e;
            status = 'fail';
            message = e.message.includes("ETIMEDOUT") ? "Command was killed due to timeout" : e.message;
            endTime = new Date();
        }

        // Output Comparison
        if (status === 'pass') {
            const isMatch = compareOutput(output, expectedOutput, comparisonMethod);
            if (!isMatch) {
                status = 'fail';
                message = `Output does not match expected. Got: ${output}`;
            }
        }

        const result = {
            version: 1,
            status: status,
            tests: [{
                name: testName,
                status: status,
                message: message,
                test_code: `${command} <stdin>${input}`,
                filename: "",
                line_no: 0,
                duration: endTime - startTime
            }]
        }

        core.setOutput('result', JSON.stringify(result));

    } catch (error) {
        const result = {
            version: 1,
            status: "fail",
            tests: [{
                name: testName,
                status: 'fail',
                message: error.message,
                test_code: `${command} <stdin>${input}`,
                filename: "",
                line_no: 0,
                duration: 0
            }]
        }

        core.setOutput('result', JSON.stringify(result));
    }
}

function compareOutput(output, expected, method) {
    switch (method) {
        case 'exact':
            return output === expected;
        case 'contains':
            return output.includes(expected);
        case 'regex':
            const regex = new RegExp(expected);
            return regex.test(output);
        default:
            throw new Error(`Invalid comparison method: ${method}`);
    }
}

run();
