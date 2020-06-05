import React, { useMemo } from 'react';
import { Alert } from 'react-components';
import { c } from 'ttag';
import { isDarkTheme } from 'proton-shared/lib/themes/helpers';
import { MailSettings } from 'proton-shared/lib/interfaces';

import { FilterModalModel, Errors } from './interfaces';
import SieveEditor from './SieveEditor';

interface Props {
    model: FilterModalModel;
    onChange: (newModel: FilterModalModel) => void;
    errors: Errors;
    mailSettings: MailSettings;
}

const SieveForm = ({ model, mailSettings, onChange }: Props) => {
    const theme = useMemo(() => (isDarkTheme(mailSettings.Theme) ? 'base16-dark' : ''), [mailSettings.Theme]);
    return (
        <>
            <Alert learnMore="https://protonmail.com/support/knowledge-base/sieve-advanced-custom-filters/">{c('Info')
                .t`Custom filters work on all new emails, including incoming emails as well as sent emails. To find out how to write Sieve filters.`}</Alert>
            <SieveEditor
                value={model.sieve}
                issues={model.issues}
                theme={theme}
                onChange={(editor, data, sieve) => onChange({ ...model, sieve })}
            />
        </>
    );
};

export default SieveForm;