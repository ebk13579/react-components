import React, { ChangeEvent } from 'react';
import { c } from 'ttag';

import { Input, Label } from '../..';

interface Props {
    totp: string;
    setTotp: (newTotp: string) => void;
}

const TOTPForm = ({ totp, setTotp }: Props) => {
    return (
        <div className="flex onmobile-flex-column signup-label-field-container mb0-5">
            <Label htmlFor="twoFa">{c('Label').t`Two-factor code`}</Label>
            <div className="flex-item-fluid">
                <Input
                    type="text"
                    name="twoFa"
                    autoFocus
                    autoCapitalize="off"
                    autoCorrect="off"
                    id="twoFa"
                    required
                    value={totp}
                    className="w100"
                    placeholder="123456"
                    onChange={({ target: { value } }: ChangeEvent<HTMLInputElement>) => setTotp(value)}
                    data-cy-login="TOTP"
                />
            </div>
        </div>
    );
};

export default TOTPForm;