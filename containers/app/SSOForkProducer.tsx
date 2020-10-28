import React, { useEffect, useState } from 'react';
import {
    getActiveSessions,
    GetActiveSessionsResult,
    resumeSession,
} from 'proton-shared/lib/authentication/persistedSessionHelper';
import {
    getProduceForkParameters,
    produceFork,
    ProduceForkParameters,
} from 'proton-shared/lib/authentication/sessionForking';
import { InvalidPersistentSessionError } from 'proton-shared/lib/authentication/error';
import { getApiErrorMessage, getIs401Error } from 'proton-shared/lib/api/helpers/apiErrorHelper';
import { traceError } from 'proton-shared/lib/helpers/sentry';
import { FORK_TYPE } from 'proton-shared/lib/authentication/ForkInterface';

import { useApi, useNotifications } from '../../hooks';
import LoaderPage from './LoaderPage';
import ModalsChildren from '../modals/Children';
import StandardLoadError from './StandardLoadError';

interface Props {
    onActiveSessions: (data: ProduceForkParameters, activeSessions: GetActiveSessionsResult) => void;
    onInvalidFork: () => void;
}

const SSOForkProducer = ({ onActiveSessions, onInvalidFork }: Props) => {
    const [error, setError] = useState<Error | undefined>();
    const [done, setDone] = useState(false);
    const normalApi = useApi();
    const silentApi = <T,>(config: any) => normalApi<T>({ ...config, silence: true });
    const { createNotification } = useNotifications();

    useEffect(() => {
        const run = async () => {
            const { app, state, localID, type } = getProduceForkParameters();
            if (!app || !state) {
                onInvalidFork();
                return;
            }

            const handleActiveSessions = async (activeSessionsResult: GetActiveSessionsResult) => {
                const { session, sessions } = activeSessionsResult;

                if (session && sessions.length === 1 && type !== FORK_TYPE.SWITCH) {
                    const { UID, keyPassword } = session;
                    await produceFork({
                        api: silentApi,
                        UID,
                        keyPassword,
                        state,
                        app,
                    });
                    setDone(true);
                    return;
                }

                onActiveSessions({ state, app, type }, activeSessionsResult);
            };

            if (localID === undefined) {
                const activeSessionsResult = await getActiveSessions(silentApi);
                await handleActiveSessions(activeSessionsResult);
                return;
            }

            try {
                // Resume session and produce the fork
                const validatedSession = await resumeSession(silentApi, localID);
                await produceFork({
                    api: silentApi,
                    keyPassword: validatedSession.keyPassword,
                    UID: validatedSession.UID,
                    state,
                    app,
                });
                setDone(true);
            } catch (e) {
                if (e instanceof InvalidPersistentSessionError || getIs401Error(e)) {
                    const activeSessionsResult = await getActiveSessions(silentApi);
                    await handleActiveSessions(activeSessionsResult);
                    return;
                }
                throw e;
            }
        };
        run().catch((e) => {
            const errorMessage = getApiErrorMessage(e) || 'Unknown error';
            createNotification({ type: 'error', text: errorMessage });
            traceError(e);
            console.error(e);
            setError(e);
        });
    }, []);

    if (error) {
        return <StandardLoadError />;
    }

    return (
        <>
            <LoaderPage />
            <ModalsChildren />
        </>
    );
};

export default SSOForkProducer;
