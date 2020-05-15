import React from 'react';
import { c } from 'ttag';
import { EMAIL_PLACEHOLDER, PASSWORD_PLACEHOLDER } from 'proton-shared/lib/constants';
import { Input, Label, PasswordInput } from '../../index';

interface Props {
    username: string;
    setUsername: (newUsername: string) => void;
    password: string;
    setPassword: (newPassword: string) => void;
}

const PasswordForm = ({ username, setUsername, password, setPassword }: Props) => {
    return (
        <>
            <div className="flex onmobile-flex-column mb1">
                <Label htmlFor="login">{c('Label').t`Email / Username`}</Label>
                <div className="flex-item-fluid">
                    <Input
                        type="text"
                        name="login"
                        autoFocus
                        autoCapitalize="off"
                        autoCorrect="off"
                        id="login"
                        required
                        value={username}
                        placeholder={EMAIL_PLACEHOLDER}
                        onChange={({ target: { value } }) => setUsername(value)}
                        data-cy-login="username"
                    />
                </div>
            </div>
            <div className="flex onmobile-flex-column mb2">
                <Label htmlFor="password">{c('Label').t`Password`}</Label>
                <div className="flex-item-fluid">
                    <div className="mb0-5">
                        <PasswordInput
                            name="password"
                            autoComplete="current-password"
                            id="password"
                            required
                            value={password}
                            placeholder={PASSWORD_PLACEHOLDER}
                            onChange={({ target: { value } }) => setPassword(value)}
                            data-cy-login="password"
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default PasswordForm;
