import React, { useMemo } from 'react';
import { c } from 'ttag';

import {
    FormModal,
    ErrorBoundary,
    GenericError,
    useContactEmails,
    useUserKeys,
    useContactGroups,
    useAddresses,
    useModals,
    ContactModal
} from 'react-components';
import { toMap } from 'proton-shared/lib/helpers/object';
import { noop } from 'proton-shared/lib/helpers/function';

import ContactContainer from '../ContactContainer';
import useContactList from '../useContactList';
import useContact from '../useContact';
import useContactProperties from '../useContactProperties';

interface Props {
    contactID: string;
    onClose?: () => void;
}

const ContactDetailsModal = ({ contactID, onClose = noop, ...rest }: Props) => {
    const { createModal } = useModals();
    const [contactEmails, loadingContactEmails] = useContactEmails();
    const [contacts, loadingContacts] = useContactEmails();
    const [contactGroups = [], loadingContactGroups] = useContactGroups();
    const [userKeysList, loadingUserKeys] = useUserKeys();
    const [addresses = [], loadingAddresses] = useAddresses();
    const { contactEmailsMap } = useContactList({ contactEmails, contacts });
    const [contact, contactLoading] = useContact(contactID);

    const { properties } = useContactProperties({ contact, userKeysList });

    const openContactModal = () => {
        createModal(<ContactModal properties={properties} contactID={contactID} />);
        onClose();
    };

    const ownAddresses = useMemo(() => addresses.map(({ Email }) => Email), [addresses]);
    const contactGroupsMap = useMemo(() => toMap(contactGroups), [contactGroups]);

    const isLoading =
        contactLoading ||
        loadingContactEmails ||
        loadingContactGroups ||
        loadingUserKeys ||
        loadingAddresses ||
        loadingContacts;

    return (
        <FormModal
            title={c(`Title`).t`Contact details`}
            loading={isLoading}
            close={c('Action').t`Cancel`}
            submit={c('Action').t`Edit`}
            disabled
            onSubmit={openContactModal}
            onClose={onClose}
            {...rest}
        >
            <ErrorBoundary
                key={contactID}
                component={<GenericError className="pt2 view-column-detail flex-item-fluid" />}
            >
                <ContactContainer
                    contactID={contactID}
                    contactEmails={contactEmailsMap[contactID]}
                    contactGroupsMap={contactGroupsMap}
                    ownAddresses={ownAddresses}
                    userKeysList={userKeysList}
                    onDelete={() => onClose()}
                    isModal
                />
            </ErrorBoundary>
        </FormModal>
    );
};

export default ContactDetailsModal;
