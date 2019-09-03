import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { c } from 'ttag';
import { PrimaryButton, Input } from 'react-components';

const CouponForm = ({ onChange, model }) => {
    const [coupon, setCoupon] = useState(model.coupon);
    const handleChange = ({ target }) => setCoupon(target.value);

    const handleSubmit = (e) => {
        e.preventDefault();
        onChange({ ...model, coupon }, true);
    };

    return (
        <div className="flex flex-spacebetween mb1">
            <div className="mr1">
                <Input
                    autoFocus={true}
                    placeholder={c('Placeholder').t`Coupon`}
                    value={coupon}
                    onChange={handleChange}
                    onPressEnter={handleSubmit}
                />
            </div>
            <div>
                <PrimaryButton onClick={handleSubmit}>{c('Action').t`Apply`}</PrimaryButton>
            </div>
        </div>
    );
};

CouponForm.propTypes = {
    onChange: PropTypes.func.isRequired,
    model: PropTypes.object.isRequired
};

export default CouponForm;
