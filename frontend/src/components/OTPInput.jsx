import React, { useState, useRef, useEffect } from 'react';

export default function OTPInput({ length = 6, value, onChange }) {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const inputRefs = useRef([]);

  useEffect(() => {
    // If value prop is empty string (like reset), clear the boxes
    if (value === "") {
      setOtp(new Array(length).fill(""));
    }
  }, [value, length]);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    setOtp((prevOtp) => {
      const newOtp = [...prevOtp];
      newOtp[index] = element.value;
      const combinedValue = newOtp.join("");
      onChange(combinedValue);
      return newOtp;
    });

    // Focus next input
    if (element.nextSibling && element.value) {
      element.nextSibling.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otp[index] && inputRefs.current[index - 1]) {
        // If current is empty, move focus to previous and clear it
        inputRefs.current[index - 1].focus();
        setOtp((prevOtp) => {
          const newOtp = [...prevOtp];
          newOtp[index - 1] = "";
          onChange(newOtp.join(""));
          return newOtp;
        });
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    // Strip all non-digit characters so pasting "123 456", "123-456", etc. all work
    const pastedData = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')       // keep only digits
      .slice(0, length)
      .split('');

    if (pastedData.length === 0) return;

    const newOtp = new Array(length).fill('');
    pastedData.forEach((char, i) => {
      newOtp[i] = char;
      if (inputRefs.current[i]) inputRefs.current[i].value = char;
    });

    setOtp(newOtp);
    onChange(newOtp.join(''));

    // Focus the last filled box (or last box if fully filled)
    const focusIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center my-2" onPaste={handlePaste}>
      {otp.map((data, index) => {
        return (
          <input
            key={index}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength="1"
            ref={(ref) => inputRefs.current[index] = ref}
            value={data}
            onChange={(e) => handleChange(e.target, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className="w-10 h-12 text-center text-lg font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30 transition-all shadow-sm placeholder-slate-300 dark:placeholder-slate-600"
            placeholder="-"
          />
        );
      })}
    </div>
  );
}
