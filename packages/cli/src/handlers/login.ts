import { AuthorizationError, formatDate } from '@lightdash/common';
import inquirer from 'inquirer';
import fetch from 'node-fetch';
import { URL } from 'url';
import { LightdashAnalytics } from '../analytics/analytics';
import { configFilePath, setContext, setDefaultUser } from '../config';
import GlobalState from '../globalState';
import * as styles from '../styles';
import { checkLightdashVersion } from './dbt/apiClient';
import { setFirstProject, setProjectCommand } from './setProject';

type LoginOptions = {
    token?: string;
    interactive?: boolean;
    verbose: boolean;
};

const loginWithToken = async (
    url: string,
    token: string,
    proxyAuthorization?: string,
) => {
    const userInfoUrl = new URL(`/api/v1/user`, url).href;
    const proxyAuthorizationHeader = proxyAuthorization
        ? { 'Proxy-Authorization': proxyAuthorization }
        : undefined;
    const headers = {
        Authorization: `ApiKey ${token}`,
        'Content-Type': 'application/json',
        ...proxyAuthorizationHeader,
    };
    const response = await fetch(userInfoUrl, {
        method: 'GET',
        headers,
    });

    if (response.status !== 200) {
        throw new AuthorizationError(
            `Cannot sign in with token:\n${JSON.stringify(
                await response.json(),
            )}`,
        );
    }
    const userBody = await response.json();
    const { userUuid, organizationUuid } = userBody;
    return {
        userUuid,
        organizationUuid,
        token,
    };
};

const loginWithPassword = async (url: string) => {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'email',
        },
        {
            type: 'password',
            name: 'password',
        },
    ]);
    const { email, password } = answers;
    const loginUrl = new URL(`/api/v1/login`, url).href;
    const response = await fetch(loginUrl, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    GlobalState.debug(`> Login response status: ${response.status}`);

    switch (response.status) {
        case 200:
            break;
        case 401:
            throw new AuthorizationError(
                `Unable to authenticate: invalid email or password`,
            );
        default:
            // This error doesn't return a valid JSON, so we use .text instead
            throw new AuthorizationError(
                `Unable to authenticate: (${
                    response.status
                }) ${await response.text()}\nIf you use single sign-on (SSO) in the browser, login with a personal access token.`,
            );
    }

    const loginBody = await response.json();
    const header = response.headers.get('set-cookie');
    if (header === null) {
        throw new AuthorizationError(
            `Cannot sign in:\n${JSON.stringify(loginBody)}`,
        );
    }
    const { userUuid, organizationUuid } = loginBody.results;
    const cookie = header.split(';')[0]?.split('=')[1];
    const patUrl = new URL(`/api/v1/user/me/personal-access-tokens`, url).href;
    const now = new Date();
    const description = `Generated by the Lightdash CLI on ${formatDate(now)}`;
    const expiresAt = new Date(now.setDate(now.getDate() + 30));
    const body = JSON.stringify({ expiresAt, description });
    const patResponse = await fetch(patUrl, {
        method: 'POST',
        body,
        headers: {
            'Content-Type': 'application/json',
            Cookie: `connect.sid=${cookie}`,
        },
    });
    const patResponseBody = await patResponse.json();
    const { token } = patResponseBody.results;
    return {
        userUuid,
        organizationUuid,
        token,
    };
};

export const login = async (url: string, options: LoginOptions) => {
    GlobalState.setVerbose(options.verbose);
    await checkLightdashVersion();

    GlobalState.debug(`> Login URL: ${url}`);

    await LightdashAnalytics.track({
        event: 'login.started',
        properties: {
            url,
            method: options.token ? 'token' : 'password',
        },
    });

    if (url.includes('lightdash.com')) {
        const cloudServer = url.replace('lightdash.com', 'lightdash.cloud');
        console.error(
            `\n${styles.title('Warning')}: Login URL ${styles.secondary(
                url,
            )} does not match a valid cloud server, perhaps you meant ${styles.secondary(
                cloudServer,
            )} ?\n`,
        );
    }
    const proxyAuthorization = process.env.LIGHTDASH_PROXY_AUTHORIZATION;
    const { userUuid, token, organizationUuid } = options.token
        ? await loginWithToken(url, options.token, proxyAuthorization)
        : await loginWithPassword(url);

    GlobalState.debug(`> Logged in with userUuid: ${userUuid}`);

    await LightdashAnalytics.track({
        event: 'login.completed',
        properties: {
            userId: userUuid,
            organizationId: organizationUuid,
            url,
            method: options.token ? 'token' : 'password',
        },
    });
    await setContext({ serverUrl: url, apiKey: token });

    GlobalState.debug(`> Saved config on: ${configFilePath}`);

    await setDefaultUser(userUuid, organizationUuid);

    console.error(`\n  ✅️ Login successful\n`);

    try {
        if (process.env.CI === 'true') {
            await setFirstProject();
        } else {
            const project = await setProjectCommand();

            if (project === undefined) {
                console.error(
                    'Now you can add your first project to lightdash by doing: ',
                );
                console.error(
                    `\n  ${styles.bold(`⚡️ lightdash deploy --create`)}\n`,
                );
            }
        }
    } catch {
        console.error('Unable to select projects, try with: ');
        console.error(
            `\n  ${styles.bold(`⚡️ lightdash config set-project`)}\n`,
        );
    }
};
