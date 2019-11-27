// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { DebugConfiguration } from 'vscode';
import { ITestItem, TestKind, TestLevel } from '../protocols';
import { IExecutionConfig } from '../runConfigs';
import { BaseRunner } from '../runners/baseRunner/BaseRunner';
import { IJUnitLaunchArguments } from '../runners/baseRunner/BaseRunner';
import { IRunnerContext } from '../runners/models';
import { resolveJUnitLaunchArguments } from './commandUtils';
import { randomSequence } from './configUtils';

export async function resolveLaunchConfigurationForRunner(runner: BaseRunner, tests: ITestItem[], runnerContext: IRunnerContext, config?: IExecutionConfig): Promise<DebugConfiguration> {
    if (tests[0].kind === TestKind.TestNG) {
        const testNGArguments: IJUnitLaunchArguments = await getTestNGLaunchArguments(tests[0]);

        let env: {} = {};
        if (config && config.env) {
            env = config.env;
        }

        if (config && config.vmargs) {
            testNGArguments.vmArguments.push(...config.vmargs.filter(Boolean));
        }

        return {
            name: `Launch Java Tests - ${randomSequence()}`,
            type: 'java',
            request: 'launch',
            mainClass: runner.runnerMainClassName,
            projectName: tests[0].project,
            cwd: config ? config.workingDirectory : undefined,
            classPaths: [...testNGArguments.classpath, await runner.runnerJarFilePath, await runner.runnerLibPath],
            modulePaths: testNGArguments.modulepath,
            args: runner.getApplicationArgs(config),
            vmArgs: testNGArguments.vmArguments,
            env,
            noDebug: !runnerContext.isDebug,
        };
    }

    return await getDebugConfigurationForEclispeRunner(tests[0], runnerContext, config);
}

export async function getDebugConfigurationForEclispeRunner(test: ITestItem, runnerContext: IRunnerContext, config?: IExecutionConfig): Promise<DebugConfiguration> {
    const junitLaunchArgs: IJUnitLaunchArguments = await getJUnitLaunchArguments(test, runnerContext);

    if (config && config.vmargs) {
        junitLaunchArgs.vmArguments.push(...config.vmargs.filter(Boolean));
    }
    let env: {} = {};
    if (config && config.env) {
        env = config.env;
    }

    return {
        name: `Launch Java Tests - ${randomSequence()}`,
        type: 'java',
        request: 'launch',
        mainClass: junitLaunchArgs.mainClass,
        projectName: junitLaunchArgs.projectName,
        cwd: config ? config.workingDirectory : undefined,
        classPaths: junitLaunchArgs.classpath,
        modulePaths: junitLaunchArgs.modulepath,
        args: junitLaunchArgs.programArguments,
        vmArgs: junitLaunchArgs.vmArguments,
        env,
        noDebug: !runnerContext.isDebug,
    };
}

async function getJUnitLaunchArguments(test: ITestItem, runnerContext: IRunnerContext): Promise<IJUnitLaunchArguments> {
    let className: string = '';
    let methodName: string = '';

    const nameArray: string[] = runnerContext.fullName.split('#');
    className = nameArray[0];
    if (nameArray.length > 1) {
        methodName = nameArray[1];
        if (test.paramTypes.length > 0) {
            methodName = `${methodName}(${test.paramTypes.join(',')})`;
        }
    }

    return await resolveJUnitLaunchArguments(runnerContext.testUri, className, methodName, runnerContext.projectName || test.project, runnerContext.scope, test.kind);
}

async function getTestNGLaunchArguments(test: ITestItem): Promise<IJUnitLaunchArguments> {
    return await resolveJUnitLaunchArguments('', '', '', test.project, TestLevel.Root, test.kind);
}
