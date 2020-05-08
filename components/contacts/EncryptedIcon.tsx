import React from 'react';
import { c } from 'ttag';
import { Tooltip, Icon } from 'react-components';

const EncryptedIcon = ({ ...rest }) => {
    return (
        <Tooltip {...rest} title={c('Tooltip').t`Encrypted data with verified digital signature`}>
            <Icon name="lock" className="flex flex-item-centered" />
        </Tooltip>
    );
};

export default EncryptedIcon;
