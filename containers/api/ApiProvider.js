import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import xhr from 'proton-shared/lib/fetch/fetch';
import { getUser } from 'proton-shared/lib/api/user';
import { ping } from 'proton-shared/lib/api/tests';
import configureApi from 'proton-shared/lib/api';
import withApiHandlers, {
    CancelUnlockError,
    CancelVerificationError,
} from 'proton-shared/lib/api/helpers/withApiHandlers';
import { getDateHeader } from 'proton-shared/lib/fetch/helpers';
import { API_CUSTOM_ERROR_CODES } from 'proton-shared/lib/errors';
import { updateServerTime } from 'pmcrypto';
import { c } from 'ttag';
import { getApiError, getApiErrorMessage } from 'proton-shared/lib/api/helpers/apiErrorHelper';
import { getClientID } from 'proton-shared/lib/apps/helper';

import ApiContext from './apiContext';
import ApiStatusContext from './apiStatusContext';
import { useModals, useNotifications } from '../../hooks';
import UnlockModal from '../login/UnlockModal';
import DelinquentModal from './DelinquentModal';
import HumanVerificationModal from './humanVerification/HumanVerificationModal';
import OfflineNotification from './OfflineNotification';

const OFFLINE_DELAY = 5000; // how time the offline growler need to stay

const getSilenced = ({ silence } = {}, code) => {
    if (Array.isArray(silence)) {
        return silence.includes(code);
    }
    return !!silence;
};

const defaultApiStatus = {
    offline: false,
    invalidVersion: false
}

/** @type any */
const ApiProvider = ({ config, onLogout, children, UID }) => {
    const { createNotification } = useNotifications();
    const { createModal } = useModals();
    const [apiStatus, setApiStatus] = useState(defaultApiStatus);
    const apiRef = useRef();
    const offlineRef = useRef();
    const appVersionBad = useRef();

    if (!apiRef.current) {
        const handleError = (e) => {
            const { code } = getApiError(e);
            const errorMessage = getApiErrorMessage(e);

            if (appVersionBad.current) {
                throw e;
            }

            if (e.name === 'CancelUnlock' || e.name === 'AbortError') {
                throw e;
            }
            if (e.name === 'OfflineError') {
                setApiStatus((x) => ({ ...x, offline: true }));
                throw e;
            }

            if (code === API_CUSTOM_ERROR_CODES.APP_VERSION_BAD) {
                appVersionBad.current = true;
                // The only way to get out of this one is to refresh.
                createNotification({
                    type: 'error',
                    text: errorMessage,
                    expiration: -1,
                    disableAutoClose: true,
                });
                throw e;
            }

            if (e.name === 'InactiveSession') {
                // Logout if the provider was created with a UID
                if (UID) {
                    onLogout();
                }
                throw e;
            }

            if (e.name === 'OfflineError') {
                const id = createNotification({
                    type: 'warning',
                    text: (
                        <OfflineNotification
                            message={errorMessage}
                            onRetry={() => {
                                hideOfflineNotification();
                                // If there is a session, get user to validate it's still active after coming back online
                                // otherwise if it's not logged in, call ping
                                apiRef.current(UID ? getUser() : ping());
                            }}
                        />
                    ),
                    expiration: OFFLINE_DELAY,
                    disableAutoClose: true,
                });
                offlineRef.current = { id };
                throw e;
            }

            if (e.name === 'TimeoutError') {
                const isSilenced = getSilenced(e.config, code);
                if (!isSilenced) {
                    createNotification({ type: 'error', text: errorMessage });
                }
                throw e;
            }

            if (errorMessage) {
                const isSilenced = getSilenced(e.config, code);
                if (!isSilenced) {
                    createNotification({ type: 'error', text: errorMessage });
                }
            }

            throw e;
        };

        const handleUnlock = (missingScopes = [], e) => {
            if (missingScopes.includes('nondelinquent')) {
                return new Promise((resolve, reject) => {
                    createModal(<DelinquentModal onClose={() => reject(CancelUnlockError())} />);
                });
            }
            if (missingScopes.includes('locked')) {
                return new Promise((resolve, reject) => {
                    createModal(<UnlockModal onClose={() => reject(CancelUnlockError())} onSuccess={resolve} />);
                });
            }
            return Promise.reject(e);
        };

        const handleVerification = ({ token, methods, onVerify }) => {
            return new Promise((resolve, reject) => {
                createModal(
                    <HumanVerificationModal
                        token={token}
                        methods={methods}
                        onClose={() => reject(CancelVerificationError())}
                        onVerify={onVerify}
                        onSuccess={resolve}
                    />
                );
            });
        };

        const call = configureApi({
            ...config,
            CLIENT_ID: getClientID(config.APP_NAME),
            xhr,
            UID,
        });

        const callWithApiHandlers = withApiHandlers({
            call,
            UID,
            onError: handleError,
            onUnlock: handleUnlock,
            onVerification: handleVerification,
        });

        apiRef.current = ({ output = 'json', ...rest }) => {
            if (appVersionBad.current) {
                return Promise.reject(new Error(c('Error').t`Bad app version`));
            }
            return callWithApiHandlers(rest).then((response) => {
                const serverTime = getDateHeader(response.headers);
                if (serverTime) {
                    updateServerTime(serverTime);
                }
                hideOfflineNotification();
                return output === 'stream' ? response.body : response[output]();
            });
        };
    }

    return (
        <ApiContext.Provider value={apiRef.current}>
            <ApiStatusContext.Provider value={}>
                {children}
            </ApiStatusContext.Provider>
        </ApiContext.Provider>
    );
};

ApiProvider.propTypes = {
    children: PropTypes.node.isRequired,
    config: PropTypes.object.isRequired,
    UID: PropTypes.string,
    onLogout: PropTypes.func,
};

export default ApiProvider;
