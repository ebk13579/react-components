import { useRef, useState, useEffect } from 'react';

import { splitKeys } from 'proton-shared/lib/keys/keys';
import { prepareContact, CryptoProcessingError } from 'proton-shared/lib/contacts/decrypt';
import { CachedKey } from 'proton-shared/lib/interfaces';
import { Contact, ContactProperties } from 'proton-shared/lib/interfaces/contacts/Contact';

export type ContactPropertiesModel = {
    ID?: string;
    properties?: ContactProperties;
    errors?: CryptoProcessingError[];
};

interface Props {
    userKeysList: CachedKey[];
    contact: Contact;
}

const useContactProperties = ({ contact, userKeysList }: Props) => {
    const ref = useRef('');
    const [model, setModel] = useState<ContactPropertiesModel>({});

    useEffect(() => {
        if (contact && userKeysList.length) {
            ref.current = contact.ID;
            const { publicKeys, privateKeys } = splitKeys(userKeysList);

            prepareContact(contact, { publicKeys, privateKeys }).then(({ properties, errors }) => {
                if (ref.current !== contact.ID) {
                    return;
                }
                setModel({ ID: contact.ID, properties, errors });
            });
        }
    }, [contact, userKeysList]);

    return model;
};

export default useContactProperties;
