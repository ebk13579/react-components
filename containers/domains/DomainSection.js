import React, { useState } from 'react';
import { c } from 'ttag';
import PropTypes from 'prop-types';
import { Alert, LearnMore, Row, Label, Input, Text } from 'react-components';

const DomainSection = ({ domain, onChange }) => {
    const [domainName, updateDomainName] = useState(domain.DomainName || '');

    const handleChange = (event) => {
        const name = event.target.value;

        onChange(name);
        updateDomainName(name);
    };

    return (
        <>
            <Alert>
                {c('Label for adding a new custom domain').t`Add a domain that you own to your ProtonMail account.`}
                <br />
                <LearnMore url="https://protonmail.com/support/knowledge-base/custom-domains/" />
            </Alert>
            <Row>
                <Label htmlFor="domainName">{c('Label').t`Enter your domain`}</Label>
                {domain.ID ? (
                    <Text>{domainName}</Text>
                ) : (
                    <Input
                        id="domainName"
                        value={domainName}
                        placeholder={c('Placeholder').t`yourdomain.com`}
                        onChange={handleChange}
                        required
                    />
                )}
            </Row>
            {!domain.ID && domainName.toLowerCase().startsWith('www.') ? (
                <Alert type="warning">{c('Domain modal')
                    .t`'www' subdomains are typically not used for email. Are you sure you want to use this domain value?`}</Alert>
            ) : null}
        </>
    );
};

DomainSection.propTypes = {
    domain: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired
};

export default DomainSection;
