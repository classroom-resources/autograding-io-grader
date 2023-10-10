// src/index.js

const {
    execSync
} = require('child_process');
const core = require('@actions/core');

function runAction() {
    try {
        // Parse Inputs
        const testName = core.getInput('test-name', {
            required: true
        });
        const setupCommand = core.getInput('setup-command');
        const command = core.getInput('command', {
            required: true
        });
        const input = core.getInput('input').trim();
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

        try {
            output = execSync(command, {
                input,
                timeout
            }).toString().trim();
        } catch (e) {
            error = e;
            status = 'fail';
            message = e.message.includes("ETIMEDOUT") ? "Command was killed due to timeout" : e.message;
        }

        // Output Comparison
        if (status === 'pass') {
            const isMatch = compareOutput(output, expectedOutput, comparisonMethod);
            if (!isMatch) {
                status = 'fail';
                message = `Output does not match expected. Got: ${output}`;
            }
        }

        // Generate Output
        const result = {
            status: status,
            message: message,
            tests: [{
                name: testName,
                status: status,
                message: message
            }]
        };

        // Set GitHub Action Output
        core.setOutput('result', JSON.stringify(result));

    } catch (error) {
        core.setFailed(error.message);
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

runAction();