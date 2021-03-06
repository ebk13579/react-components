import { c } from 'ttag';
import { OpenPGPKey } from 'pmcrypto';
import { Address as tsAddress, CachedKey, ActionableKey, Api } from 'proton-shared/lib/interfaces';
import { reformatAddressKey } from 'proton-shared/lib/keys/keys';
import { SetKeys, ImportKey, Status } from './interface';
import createKeyHelper from '../addKey/createKeyHelper';
import { reactivateByUpload, reactivatePrivateKey } from '../reactivateKeys/reactivateHelper';
import { updateKey } from './state';

interface Arguments {
    api: Api;
    signingKey: OpenPGPKey;
    keysToImport: ImportKey[];
    setKeysToImport: SetKeys;
    password: string;
    parsedKeys: CachedKey[];
    actionableKeys: ActionableKey[];
    Address: tsAddress;
}
export default async ({
    api,
    keysToImport,
    signingKey,
    password,
    parsedKeys,
    actionableKeys,
    setKeysToImport,
    Address,
}: Arguments) => {
    let updatedAddressKeys = actionableKeys;

    for (const key of keysToImport) {
        try {
            const { privateKey: uploadedPrivateKey, fingerprint } = key;

            const maybeOldKey = parsedKeys.find(({ privateKey }) => privateKey?.getFingerprint() === fingerprint);

            if (maybeOldKey) {
                const {
                    Key: { ID, PrivateKey },
                    privateKey: oldPrivateKey,
                } = maybeOldKey;

                if (oldPrivateKey?.isDecrypted()) {
                    throw new Error(c('Error').t`Key is already decrypted`);
                }

                const { privateKey, encryptedPrivateKeyArmored } = await reactivateByUpload({
                    ID,
                    newPassword: password,
                    PrivateKey,
                    uploadedPrivateKey,
                    parsedKeys,
                    email: Address?.Email,
                });
                updatedAddressKeys = await reactivatePrivateKey({
                    api,
                    ID,
                    parsedKeys,
                    actionableKeys: updatedAddressKeys,
                    encryptedPrivateKeyArmored,
                    privateKey,
                    signingKey,
                    Address,
                });
            } else {
                const { privateKey: reformattedPrivateKey, privateKeyArmored } = await reformatAddressKey({
                    email: Address.Email,
                    passphrase: password,
                    privateKey: uploadedPrivateKey,
                });

                updatedAddressKeys = await createKeyHelper({
                    api,
                    privateKeyArmored,
                    privateKey: reformattedPrivateKey,
                    Address,
                    actionableKeys: updatedAddressKeys,
                    parsedKeys,
                    signingKey,
                });
            }

            setKeysToImport((oldKeys) => updateKey(oldKeys, key, { status: Status.SUCCESS }));
        } catch (e) {
            setKeysToImport((oldKeys) => updateKey(oldKeys, key, { status: Status.ERROR, result: e }));
        }
    }
};
