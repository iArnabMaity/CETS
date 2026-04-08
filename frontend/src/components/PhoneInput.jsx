import React, { forwardRef, useRef, useImperativeHandle, useEffect } from 'react';
import IntlTelInput from 'intl-tel-input/react';
import 'intl-tel-input/build/css/intlTelInput.min.css';
import { Phone } from 'lucide-react';

/**
 * PhoneInput - Reusable international phone input component
 * 
 * @param {string} value - Current phone number value
 * @param {function} onChange - Callback triggered when number changes
 * @param {string} label - Overlay label text
 * @param {string} className - Additional CSS classes for the input
 * @param {string} placeholder - Input placeholder
 * @param {ref} ref - React forwardRef for accessing the IntlTelInput instance (e.g., for isValidNumber())
 */
const PhoneInput = forwardRef(({ value, onChange, onBlur, label, className = "", placeholder = "Mobile Number" }, ref) => {
  const internalRef = useRef(null);

  useImperativeHandle(ref, () => {
    return internalRef.current;
  });

  useEffect(() => {
    if (internalRef.current) {
      if (typeof internalRef.current.getInstance === 'function') {
        const instance = internalRef.current.getInstance();
        if (instance && value !== undefined && value !== null) {
          if (instance.getNumber() !== value) {
            instance.setNumber(value);
          }
        }
      }
    }
  }, [value]);

  return (
    <div className="relative group w-full">
      <div className="relative">
        <IntlTelInput
          ref={internalRef}
          initialValue={value}
          onChangeNumber={onChange}
          initOptions={{
            initialCountry: "in",
            separateDialCode: true,
            utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@26.8.1/build/js/utils.js",
            countrySearch: true,
          }}
          inputProps={{
            className: `glass-input w-full !py-4 px-4 text-base font-bold text-slate-200 ${className}`,
            placeholder,
            onBlur,
          }}
        />
        <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 group-focus-within:text-purple-400 transition-colors pointer-events-none" />
      </div>
      {label && (
        <label className="absolute -top-6 left-1 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
          {label}
        </label>
      )}
    </div>
  );
});

export default PhoneInput;
