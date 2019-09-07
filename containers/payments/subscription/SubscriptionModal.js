import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { c } from 'ttag';
import {
    Alert,
    usePlans,
    FormModal,
    Button,
    PrimaryButton,
    Input,
    usePayment,
    Payment,
    useStep,
    useApi,
    useEventManager,
    useNotifications,
    useUser,
    useOrganization,
    Label,
    Field,
    Row,
    Wizard,
    useConfig,
    useModals
} from 'react-components';
import { DEFAULT_CURRENCY, DEFAULT_CYCLE, APPS } from 'proton-shared/lib/constants';
import { checkSubscription, subscribe } from 'proton-shared/lib/api/payments';
import { toPrice } from 'proton-shared/lib/helpers/string';
import { getPlans } from 'proton-shared/lib/helpers/subscription';

import './SubscriptionModal.scss';
import FeaturesList from './FeaturesList';
import CustomMailSection from './CustomMailSection';
import CustomVPNSection from './CustomVPNSection';
import OrderSummary from './OrderSummary';
import Thanks from './Thanks';
import { getCheckParams, toPlanMap, containsSamePlans } from './helpers';
import { handlePaymentToken } from '../paymentTokenHelper';

const { PROTONMAIL_SETTINGS, PROTONVPN_SETTINGS } = APPS;
const ORDER_SUMMARY_ID = 'order-summary';

const SubscriptionModal = ({
    subscription = {},
    onClose,
    cycle = DEFAULT_CYCLE,
    currency = DEFAULT_CURRENCY,
    coupon = '',
    plansMap = {},
    step: initialStep = 0,
    ...rest
}) => {
    const { APP_NAME } = useConfig();
    const api = useApi();
    const { createModal } = useModals();
    const [{ hasPaidMail } = {}] = useUser();
    const [{ MaxMembers } = {}] = useOrganization();
    const [loading, setLoading] = useState(false);
    const { method, setMethod, parameters, setParameters, canPay, setCardValidity } = usePayment();
    const { createNotification } = useNotifications();
    const [check, setCheck] = useState({});
    const [plans] = usePlans();
    const [model, setModel] = useState({ cycle, currency, coupon, plansMap });
    const { call } = useEventManager();
    const { step, next, previous, goTo } = useStep(initialStep);

    const features = [
        ...(hasPaidMail
            ? [
                  c('Link').t`Add auto-reply`,
                  c('Link').t`Add custom domain`,
                  c('Link').t`Add filters`,
                  c('Link').t`Manage encrypted contacts`
              ]
            : []),
        ...(MaxMembers > 1 ? [c('Link').t`Add new users`] : []),
        c('Link').t`Use ProtonVPN`
    ];

    const callCheck = async (m = model) => {
        try {
            setLoading(true);
            const result = await api(checkSubscription(getCheckParams({ ...m, plans })));
            const { Coupon, Gift } = result;
            const { Code } = Coupon || {}; // Coupon can equals null
            const { checkCouponCode } = STEPS[step];

            if (checkCouponCode && m.coupon && m.coupon !== Code) {
                const text = c('Error').t`Your coupon is invalid or cannot be applied to your plan`;
                createNotification({ text, type: 'error' });
                throw new Error(text);
            }

            if (m.gift && !Gift) {
                const text = c('Error').t`Invalid gift code`;
                createNotification({ text, type: 'error' });
                throw new Error(text);
            }

            setLoading(false);
            setCheck(result);
            setModel({ ...model, coupon: Code });
            return result;
        } catch (error) {
            setLoading(false);
            throw error;
        }
    };

    const handleChangeModel = async (newModel = {}, requireCheck = false) => {
        if (loading) {
            return;
        }

        if (requireCheck) {
            await callCheck(newModel);
        }

        setModel(newModel);
    };

    const handleSubmit = async (params = parameters) => {
        try {
            setLoading(true);
            const checkParams = getCheckParams({ ...model, plans });
            const requestBody = await handlePaymentToken({
                params: { ...params, Amount: check.AmountDue, Currency: checkParams.Currency },
                api,
                createModal
            });
            await api(
                subscribe({
                    ...checkParams,
                    ...requestBody
                })
            );
            await call();
            setLoading(false);
            next();
        } catch (error) {
            setLoading(false);
            throw error;
        }
    };

    const STEPS = [
        {
            title: c('Title').t`Order summary`,
            id: ORDER_SUMMARY_ID,
            checkCouponCode: true,
            closeIfSubscriptionChange: true,
            section: <OrderSummary plans={plans} model={model} check={check} onChange={handleChangeModel} />,
            async onSubmit() {
                const checkResult = await callCheck(); // Use check result instead of state because it's not yet updated
                if (!checkResult.AmountDue) {
                    try {
                        setLoading(true);
                        await api(subscribe({ Amount: checkResult.AmountDue, ...getCheckParams({ ...model, plans }) }));
                        await call();
                        setLoading(false);
                    } catch (error) {
                        setLoading(false);
                        throw error;
                    }
                }
                next();
            }
        },
        {
            title: '',
            noWizard: true,
            footer: <FeaturesList features={features} />,
            className: 'thanks-modal-container',
            section: <Thanks onClose={onClose} />
        }
    ];

    if (plansMap.vpnplus || plansMap.vpnbasic) {
        STEPS.unshift({
            title: c('Title').t`VPN protection`,
            closeIfSubscriptionChange: true,
            section: <CustomVPNSection plans={plans} model={model} onChange={handleChangeModel} />,
            async onSubmit() {
                await callCheck();
                next();
            }
        });
    }

    if (APP_NAME === PROTONMAIL_SETTINGS && (plansMap.plus || plansMap.professional)) {
        STEPS.unshift({
            title: c('Title').t`Customization`,
            closeIfSubscriptionChange: true,
            section: <CustomMailSection plans={plans} model={model} onChange={handleChangeModel} />,
            async onSubmit() {
                await callCheck();
                next();
            }
        });
    }

    if (check.AmountDue > 0) {
        // Insert it before the last one
        STEPS.splice(STEPS.length - 1, 0, {
            title: c('Title').t`Payment details`,
            checkCouponCode: true,
            section: (
                <>
                    <Alert>{c('Info')
                        .t`Your payment details are protected with TLS encryption and Swiss privacy laws.`}</Alert>
                    <Row>
                        <Label>{c('Label').t`Amount due`}</Label>
                        <Field>
                            <Input
                                className="pm-field--highlight no-pointer-events strong alignright"
                                readOnly={true}
                                value={toPrice(check.AmountDue, model.currency)}
                            />
                        </Field>
                    </Row>
                    <Payment
                        type="subscription"
                        method={method}
                        amount={check.AmountDue}
                        cycle={model.cycle}
                        currency={model.currency}
                        parameters={parameters}
                        onParameters={setParameters}
                        onMethod={setMethod}
                        onValidCard={setCardValidity}
                        onPay={handleSubmit}
                    />
                    <Alert
                        type="warning"
                        learnMore={
                            APP_NAME === PROTONVPN_SETTINGS
                                ? 'https://protonvpn.com/terms-and-conditions'
                                : 'https://protonmail.com/terms-and-conditions'
                        }
                    >{c('Info').t`By clicking Next, you agree to abide by Proton's terms and conditions.`}</Alert>
                </>
            ),
            footer: (
                <>
                    <Button onClick={previous} disabled={loading}>{c('Action').t`Previous`}</Button>
                    <PrimaryButton type="submit" disabled={!canPay} loading={loading}>{c('Action')
                        .t`Upgrade`}</PrimaryButton>
                </>
            ),
            onSubmit: () => {
                handleSubmit();
            }
        });
    }

    const hasCancel = !step;
    const hasClose = step === STEPS.length - 1;
    const hasPrevious = !hasClose && step > 0;
    const hasNext = !hasClose;
    const steps = STEPS.map(({ title }) => title);

    const close = (() => {
        if (hasCancel) {
            return c('Action').t`Cancel`;
        }
        if (hasClose) {
            return c('Action').t`Close`;
        }
        if (hasPrevious) {
            return <Button loading={loading} onClick={previous}>{c('Action').t`Previous`}</Button>;
        }
    })();

    useEffect(() => {
        callCheck();

        // Display order summary first if the current plans don't change
        if (containsSamePlans(plansMap, toPlanMap(getPlans(subscription)))) {
            const index = STEPS.findIndex(({ id }) => id === ORDER_SUMMARY_ID);
            goTo(index);
        }
    }, []);

    return (
        <FormModal
            className={STEPS[step].className}
            footer={STEPS[step].footer}
            onClose={onClose}
            onSubmit={STEPS[step].onSubmit}
            title={STEPS[step].title}
            loading={loading}
            close={close}
            submit={hasNext && c('Action').t`Next`}
            {...rest}
        >
            {STEPS[step].noWizard ? null : <Wizard step={step} steps={steps} hideText={true} />}
            {STEPS[step].section}
        </FormModal>
    );
};

SubscriptionModal.propTypes = {
    subscription: PropTypes.object,
    onClose: PropTypes.func,
    step: PropTypes.number.isRequired,
    cycle: PropTypes.number,
    coupon: PropTypes.string,
    currency: PropTypes.string,
    plansMap: PropTypes.object
};

export default SubscriptionModal;
