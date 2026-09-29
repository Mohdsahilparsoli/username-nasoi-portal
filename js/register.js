/* =========================================================
   NASOI Demo – Registration page
   ========================================================= */
(function () {
  "use strict";
  const { $, toast, openModal, formData, markErrors, RX, fillStates } = UI;

  const form = $("#regForm");
  fillStates($("#state"), $("#district"));

  // Digits-only fields
  ["mobile", "altMobile", "pincode", "account", "account2"].forEach((n) => {
    form.elements[n].addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, ""); });
  });
  form.elements.ifsc.addEventListener("input", (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); });

  // Photo preview
  $("#photo").addEventListener("change", (e) => {
    const f = e.target.files[0];
    const box = $("#photoBox");
    if (!f) { box.textContent = "Passport size photo"; return; }
    const url = URL.createObjectURL(f);
    box.innerHTML = "";
    const img = document.createElement("img");
    img.src = url; img.alt = "Photo preview";
    box.appendChild(img);
  });

  form.addEventListener("reset", () => {
    setTimeout(() => { $("#photoBox").textContent = "Passport size photo"; fillStates($("#state"), $("#district")); markErrors(form, {}); }, 0);
  });

  function validate(d) {
    const e = {};
    if (!d.eligible || !d.docConfirm) e.eligible = "Please confirm both eligibility points.";
    if (!d.name || d.name.length < 3) e.name = "Enter your full name.";
    if (!d.fatherName) e.fatherName = "Enter father's name.";
    if (!d.motherName) e.motherName = "Enter mother's name.";
    if (!d.dob) e.dob = "Select date of birth.";
    else {
      const age = (Date.now() - new Date(d.dob)) / (365.25 * 86400000);
      if (age < 18) e.dob = "You must be at least 18 years old.";
      else if (age > 65) e.dob = "Please check the date of birth.";
    }
    if (!d.gender) e.gender = "Select gender.";
    if (!d.category) e.category = "Select category.";
    if (!RX.mobile.test(d.mobile)) e.mobile = "Enter a valid 10-digit mobile number.";
    if (d.altMobile && !RX.mobile.test(d.altMobile)) e.altMobile = "Enter a valid 10-digit number.";
    else if (d.altMobile && d.altMobile === d.mobile) e.altMobile = "Alternate number must be different.";
    if (!RX.email.test(d.email)) e.email = "Enter a valid email ID.";
    if (!d.state) e.state = "Select state.";
    if (!d.district) e.district = "Select district.";
    if (!d.tehsil) e.tehsil = "Enter tehsil / sub district.";
    if (!RX.pincode.test(d.pincode)) e.pincode = "Enter a valid 6-digit pincode.";
    if (!d.address || d.address.length < 10) e.address = "Enter your complete address.";
    if (!d.bankName) e.bankName = "Enter bank name.";
    if (!d.holder) e.holder = "Enter account holder name.";
    if (!RX.account.test(d.account)) e.account = "Account number should be 9–18 digits.";
    if (d.account2 !== d.account) e.account2 = "Account numbers do not match.";
    if (!RX.ifsc.test(d.ifsc)) e.ifsc = "Enter a valid 11-character IFSC code.";
    if (!d.qualification) e.qualification = "Select qualification.";
    if (!d.declare || !d.terms) e.declare = "Please accept the declaration and terms.";
    return e;
  }

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const d = formData(form);
    if (!markErrors(form, validate(d))) { toast("Please correct the highlighted fields.", "error"); return; }

    const res = Store.registerDeo({
      name: d.name.toUpperCase(), fatherName: d.fatherName.toUpperCase(), motherName: d.motherName.toUpperCase(),
      dob: d.dob, gender: d.gender, category: d.category, religion: d.religion,
      mobile: d.mobile, altMobile: d.altMobile, email: d.email,
      state: d.state, district: d.district, tehsil: d.tehsil, pincode: d.pincode, address: d.address,
      qualification: d.qualification,
      bank: { bankName: d.bankName, holder: d.holder.toUpperCase(), account: d.account, ifsc: d.ifsc }
    });
    if (!res.ok) { toast(res.msg, "error"); return; }

    $("#newId").textContent = res.user.id;
    $("#newMobile").textContent = res.user.mobile;
    $("#newPw").textContent = res.user.password;
    $("#goLogin").href = "login.html?role=deo&id=" + encodeURIComponent(res.user.id);
    openModal("successModal");
    form.reset();
  });

  $("#copyCreds").addEventListener("click", () => {
    const text = "NASOI Registration ID: " + $("#newId").textContent + "\nMobile: " + $("#newMobile").textContent + "\nPassword: " + $("#newPw").textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(() => toast("Login details copied."))
      .catch(() => toast("Copy not available – please note the details.", "error"));
  });

  // Quick demo filler so the flow can be tested fast
  $("#fillSample").addEventListener("click", () => {
    const rnd = String(Math.floor(10000000 + Math.random() * 89999999));
    const set = (n, v) => { form.elements[n].value = v; };
    form.elements.eligible.checked = true; form.elements.docConfirm.checked = true;
    set("name", "AMIT SINGH"); set("fatherName", "RAJENDRA SINGH"); set("motherName", "MEENA DEVI");
    set("dob", "2000-08-15");
    form.querySelector('input[name=gender][value=Male]').checked = true;
    form.querySelector('input[name=category][value=GEN]').checked = true;
    set("mobile", "98" + rnd); set("email", "amit" + rnd.slice(0, 4) + "@example.com");
    fillStates($("#state"), $("#district"), "Uttar Pradesh", "Meerut");
    set("tehsil", "Mawana"); set("pincode", "250401");
    set("address", "Village Kithore, Tehsil Mawana, District Meerut");
    set("bankName", "Bank of Baroda"); set("holder", "AMIT SINGH");
    set("account", "1234567890" + rnd.slice(0, 2)); set("account2", "1234567890" + rnd.slice(0, 2)); set("ifsc", "BARB0MAWANA");
    form.querySelector('input[name=qualification][value="12th"]').checked = true;
    form.elements.declare.checked = true; form.elements.terms.checked = true;
    markErrors(form, {});
    toast("Sample data filled. Click Submit Registration.");
  });

})();
