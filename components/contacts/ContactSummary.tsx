import React from 'react';
import { c } from 'ttag';

import { Icon, classnames, LinkButton, Button, Tooltip, useActiveBreakpoint } from 'react-components';
import { getPreferredValue } from 'proton-shared/lib/contacts/properties';
import { formatAdr } from 'proton-shared/lib/contacts/property';
import { ContactProperties } from 'proton-shared/lib/interfaces/contacts';

import ContactImageSummary from './ContactImageSummary';
import './ContactSummary.scss';

interface Props {
    properties: ContactProperties;
    handleExport: () => void;
    handleDelete: () => void;
    handleEdit: (field?: string) => void;
    leftBlockWidth?: string;
}

const ContactSummary = ({ properties, handleEdit, handleDelete, handleExport, leftBlockWidth = 'w30' }: Props) => {
    const { isNarrow } = useActiveBreakpoint();

    const photo = getPreferredValue(properties, 'photo') as string;
    const name = getPreferredValue(properties, 'fn') as string;
    const email = getPreferredValue(properties, 'email');
    const tel = getPreferredValue(properties, 'tel');
    const adr = getPreferredValue(properties, 'adr') as string[];
    // const org = getPreferredValue(properties, 'org');

    const summary = [
        {
            icon: 'email',
            component: email ? (
                <a href={`mailto:${email}`} title={`${email}`}>
                    {email}
                </a>
            ) : (
                <LinkButton className="p0" onClick={() => handleEdit('email')}>
                    {c('Action').t`Add email`}
                </LinkButton>
            )
        },
        {
            icon: 'phone',
            component: tel ? (
                <a href={`tel:${tel}`}>{tel}</a>
            ) : (
                <LinkButton className="p0" onClick={() => handleEdit('tel')}>
                    {c('Action').t`Add phone number`}
                </LinkButton>
            )
        },
        {
            icon: 'address',
            component: adr ? (
                formatAdr(adr)
            ) : (
                <LinkButton className="p0" onClick={() => handleEdit('adr')}>
                    {c('Action').t`Add address`}
                </LinkButton>
            )
        }
        // org && { icon: 'organization', component: org }
    ].filter(Boolean);

    return (
        <div className={classnames(['contactsummary-container p1 mb1', !isNarrow && 'flex flex-nowrap'])}>
            <div className={classnames(['aligncenter contactsummary-photo-container', leftBlockWidth])}>
                <ContactImageSummary photo={photo} name={name} />
            </div>
            <div className="pl1 flex-item-fluid">
                <div className={isNarrow ? 'aligncenter' : 'flex flex-spacebetween'}>
                    <h2 className="mb0 ellipsis">{name}</h2>
                    <div>
                        <Button onClick={handleExport} className="ml0-5 pm-button--for-icon">
                            <Tooltip title={c('Action').t`Export`}>
                                <Icon name="export" />
                            </Tooltip>
                        </Button>

                        <Button onClick={() => handleEdit()} className="ml0-5 pm-button--for-icon">
                            <Tooltip title={c('Action').t`Edit`} className="color-primary">
                                <Icon name="pen" />
                            </Tooltip>
                        </Button>

                        <Button onClick={handleDelete} className="ml0-5 pm-button--for-icon">
                            <Tooltip title={c('Action').t`Delete`} className="color-global-warning">
                                <Icon name="trash" />
                            </Tooltip>
                        </Button>
                    </div>
                </div>
                <ul className="unstyled mt0-5">
                    {summary.map(({ icon, component }) => {
                        return (
                            <li
                                key={icon}
                                className={classnames([
                                    'contactsummary-list-item flex flex-nowrap',
                                    !isNarrow && 'flex-items-center'
                                ])}
                            >
                                <Icon name={icon} className="mr0-5" />
                                <span className={classnames([!isNarrow && 'ellipsis'])}>{component}</span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};

export default ContactSummary;