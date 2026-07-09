/* DescontoVivo – Auth UI Enhancements v4 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    injectTopbar();
    detectRegisterPage();
    setupPasswordToggles();
    fixRequiredAsterisks();
    setupFieldErrorCleanup();
    setupLivePasswordValidation();
    normalizeFieldErrorsLayout();
  });

  /* === Topbar Injection === */
  function injectTopbar() {
    if (document.querySelector('.dv-auth-topbar')) return;

    var header = document.createElement('header');
    header.className = 'dv-auth-topbar';

    header.innerHTML =
      '<a href="https://descontovivo.com/" class="dv-auth-topbar__logo" aria-label="DescontoVivo">' +
        '<span class="dv-auth-topbar__logo-img"></span>' +
      '</a>' +
      '<a href="https://descontovivo.com/" class="dv-auth-topbar__back">' +
        '\u2190 Voltar ao DescontoVivo' +
      '</a>';

    document.body.insertBefore(header, document.body.firstChild);
  }

  /* === Register Page Detection === */
  function detectRegisterPage() {
    var registerForm = document.getElementById('kc-register-form');
    if (registerForm) {
      document.body.classList.add('dv-page-register');
      return;
    }

    // Fallback: check for form action containing "registration"
    var forms = document.querySelectorAll('form');
    for (var i = 0; i < forms.length; i++) {
      var action = forms[i].getAttribute('action') || '';
      if (action.indexOf('registration') !== -1) {
        document.body.classList.add('dv-page-register');
        return;
      }
    }
  }

  /* === Password Toggle === */
  var SVG_EYE_OPEN =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>' +
      '<path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>' +
    '</svg>';

  var SVG_EYE_CLOSED =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>' +
    '</svg>';

  function setupPasswordToggles() {
    // Find password input groups (Keycloak 26.6.3+ uses .pf-c-input-group)
    var passwordInputs = document.querySelectorAll('input[type="password"]');
    
    for (var i = 0; i < passwordInputs.length; i++) {
      var input = passwordInputs[i];
      enhancePasswordGroup(input);
    }
  }

  function enhancePasswordGroup(input) {
    // Find the .pf-c-input-group parent (Keycloak 26.6.3 pattern)
    var parent = input.closest('.pf-c-input-group');
    if (!parent) return;
    
    // Skip if already enhanced
    if (parent.classList.contains('dv-password-group')) return;
    
    // Mark the group
    parent.classList.add('dv-password-group');
    input.classList.add('dv-password-input');
    
    // Apply border radius fix to the parent group for better integration
    parent.style.borderRadius = '10px';
    parent.style.overflow = 'hidden';
    
    // Find the native toggle button (Keycloak creates it via passwordVisibility.js)
    var nativeBtn = parent.querySelector('.pf-c-button.pf-m-control');
    if (nativeBtn) {
      // Enhance the native button
      nativeBtn.classList.add('dv-password-toggle-native');
      nativeBtn.setAttribute('title', 'Mostrar/ocultar senha');
      
      // Try to find and replace the icon if it's the default Keycloak one
      var currentIcon = nativeBtn.querySelector('i, svg, span');
      if (!currentIcon || (currentIcon.tagName === 'I' && currentIcon.className.includes('fa-eye'))) {
        // Replace with our better SVG
        nativeBtn.innerHTML = '';
        nativeBtn.innerHTML = SVG_EYE_OPEN;
      }
      
      nativeBtn.setAttribute('aria-label', 'Mostrar senha');
      input.style.borderRight = 'none';
      
      // Listen for password visibility changes to update icon
      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'type') {
            var isVisible = input.type === 'text';
            nativeBtn.innerHTML = isVisible ? SVG_EYE_CLOSED : SVG_EYE_OPEN;
            nativeBtn.setAttribute('aria-label', isVisible ? 'Ocultar senha' : 'Mostrar senha');
          }
        });
      });
      
      observer.observe(input, { attributes: true, attributeFilter: ['type'] });
    }
  }

  /* === Field Error Cleanup on Edit === */
  function setupFieldErrorCleanup() {
    var passwordInputs = document.querySelectorAll('input[type="password"]');
    
    for (var i = 0; i < passwordInputs.length; i++) {
      (function (input) {
        function clearFieldError() {
          input.removeAttribute('aria-invalid');
          input.classList.remove('pf-m-error', 'input-error', 'is-invalid');
          
          var formGroup = input.closest('.pf-c-form__group');
          if (!formGroup) {
            formGroup = input.closest('.form-group, .kc-form-group');
          }
          
          if (formGroup) {
            formGroup.classList.remove('pf-m-error');
            
            var errorMessages = formGroup.querySelectorAll(
              '.pf-c-form__helper-text.pf-m-error, ' +
              '.kc-feedback-text, ' +
              '[id*="input-error"], ' +
              '[id*="error"], ' +
              '.alert-error'
            );
            
            for (var j = 0; j < errorMessages.length; j++) {
              hideErrorElement(errorMessages[j]);
            }
            
            var inputGroup = input.closest('.pf-c-input-group');
            if (inputGroup && inputGroup !== formGroup) {
              inputGroup.classList.remove('pf-m-error');
              
              var inputGroupErrors = inputGroup.querySelectorAll(
                '.pf-c-form__helper-text.pf-m-error, ' +
                '.kc-feedback-text'
              );
              
              for (var k = 0; k < inputGroupErrors.length; k++) {
                hideErrorElement(inputGroupErrors[k]);
              }
            }
          }
          
          var describedBy = input.getAttribute('aria-describedby');
          if (describedBy) {
            var ids = describedBy.split(/\s+/);
            var validIds = [];
            
            for (var l = 0; l < ids.length; l++) {
              var element = document.getElementById(ids[l]);
              if (element) {
                var isErrorElement = 
                  element.classList.contains('pf-m-error') ||
                  element.classList.contains('kc-feedback-text') ||
                  element.id.includes('error') ||
                  element.id.includes('input-error') ||
                  element.getAttribute('role') === 'alert';
                
                if (isErrorElement) {
                  hideErrorElement(element);
                } else {
                  validIds.push(ids[l]);
                }
              } else {
                validIds.push(ids[l]);
              }
            }
            
            if (validIds.length > 0) {
              input.setAttribute('aria-describedby', validIds.join(' '));
            } else {
              input.removeAttribute('aria-describedby');
            }
          }
        }
        
        input.addEventListener('input', clearFieldError);
        input.addEventListener('change', clearFieldError);
        input.addEventListener('keyup', clearFieldError);
        
        input.addEventListener('focus', function() {
          setTimeout(clearFieldError, 100);
        });
      })(passwordInputs[i]);
    }
  }

  function hideErrorElement(el) {
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
    el.classList.add('dv-error-cleared');
  }

  /* === Utility: Normalize text for comparison === */
  function normalizeText(str) {
    if (typeof str !== 'string') return '';
    return str
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  /* === Check if current page is registration === */
  function isRegisterPage() {
    if (document.body.classList.contains('dv-page-register')) return true;
    
    var href = window.location.href.toLowerCase();
    if (href.includes('registration') || href.includes('registrations')) return true;
    
    if (document.getElementById('kc-register-form')) return true;
    
    var forms = document.querySelectorAll('form');
    for (var i = 0; i < forms.length; i++) {
      var action = (forms[i].getAttribute('action') || '').toLowerCase();
      if (action.includes('registration')) return true;
    }
    
    return false;
  }

  /* === Check if current page is password update/reset === */
  function isPasswordUpdatePage() {
    var href = window.location.href.toLowerCase();
    
    // Check URL patterns
    if (href.includes('update_password')) return true;
    if (href.includes('required-action') && href.includes('password')) return true;
    if (href.includes('reset-credentials')) return true;
    
    // Check page title
    var pageTitle = document.getElementById('kc-page-title');
    if (pageTitle) {
      var titleText = normalizeText(pageTitle.textContent);
      if (titleText.includes('atualizar senha') || 
          titleText.includes('redefinir senha') ||
          titleText.includes('update password') ||
          titleText.includes('reset password')) {
        return true;
      }
    }
    
    // Check for UPDATE_PASSWORD in form action or hidden inputs
    var forms = document.querySelectorAll('form');
    for (var i = 0; i < forms.length; i++) {
      var action = (forms[i].getAttribute('action') || '').toLowerCase();
      if (action.includes('required-action') || action.includes('update-password')) {
        return true;
      }
    }
    
    var hiddenInputs = document.querySelectorAll('input[type="hidden"]');
    for (var j = 0; j < hiddenInputs.length; j++) {
      var value = (hiddenInputs[j].getAttribute('value') || '').toLowerCase();
      if (value.includes('update_password')) {
        return true;
      }
    }
    
    return false;
  }

  /* === Find password fields in the form === */
  function findPasswordFields() {
    var result = {
      password: null,
      confirm: null,
      username: null,
      email: null
    };
    
    // Find password input
    var selectors = [
      '#password',
      '#password-new',
      'input[name="password"]',
      'input[name="password-new"]',
      'input[autocomplete="new-password"]'
    ];
    
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) {
        result.password = el;
        break;
      }
    }
    
    // Fallback: first password input if none found
    if (!result.password) {
      var allPasswords = document.querySelectorAll('input[type="password"]');
      if (allPasswords.length > 0) {
        result.password = allPasswords[0];
      }
    }
    
    // Find confirm password input
    selectors = [
      '#password-confirm',
      '#password-new-confirm',
      'input[name="password-confirm"]',
      'input[name="password-new-confirm"]'
    ];
    
    for (var j = 0; j < selectors.length; j++) {
      var confirmEl = document.querySelector(selectors[j]);
      if (confirmEl) {
        result.confirm = confirmEl;
        break;
      }
    }
    
    // Fallback: second password input if none found
    if (!result.confirm) {
      var allPasswords2 = document.querySelectorAll('input[type="password"]');
      if (allPasswords2.length > 1) {
        result.confirm = allPasswords2[1];
      }
    }
    
    // Find username
    var usernameSelectors = ['#username', 'input[name="username"]'];
    for (var k = 0; k < usernameSelectors.length; k++) {
      var userEl = document.querySelector(usernameSelectors[k]);
      if (userEl) {
        result.username = userEl;
        break;
      }
    }
    
    // Find email
    var emailSelectors = ['#email', 'input[name="email"]'];
    for (var m = 0; m < emailSelectors.length; m++) {
      var emailEl = document.querySelector(emailSelectors[m]);
      if (emailEl) {
        result.email = emailEl;
        break;
      }
    }
    
    return result;
  }

  /* === Hide the global required field message on registration page === */
  function hideRequiredGlobalMessage() {
    if (!isRegisterPage()) return;
    
    var requiredMessages = [
      'indica campo obrigatório',
      'indica campo obrigatorio',
      '* indica campo obrigatório',
      '* indica campo obrigatorio',
      'indicates required field',
      '* indicates required field'
    ];
    
    var candidateSelectors = [
      '.subtitle',
      '#kc-content-wrapper > div',
      '#kc-content-wrapper > span',
      '#kc-content-wrapper > p',
      '.required-fields-message',
      '.kc-form-options-wrapper',
      '.pf-c-form__group',
      '.form-group'
    ];
    
    var candidates = [];
    for (var i = 0; i < candidateSelectors.length; i++) {
      var elements = document.querySelectorAll(candidateSelectors[i]);
      for (var j = 0; j < elements.length; j++) {
        candidates.push(elements[j]);
      }
    }
    
    for (var k = 0; k < candidates.length; k++) {
      var el = candidates[k];
      if (!el || !el.textContent) continue;
      
      var normalizedText = normalizeText(el.textContent);
      
      var isRequiredMessage = false;
      for (var m = 0; m < requiredMessages.length; m++) {
        if (normalizedText === normalizeText(requiredMessages[m])) {
          isRequiredMessage = true;
          break;
        }
      }
      
      if (isRequiredMessage) {
        el.classList.add('dv-required-global-message');
        
        el.hidden = true;
        el.setAttribute('aria-hidden', 'true');
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.height = '0';
        el.style.margin = '0';
        el.style.padding = '0';
        el.style.fontSize = '0';
        el.style.opacity = '0';
        
        if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
          el.textContent = '';
        }
      }
    }
  }

  /* === Required Asterisks (inline fix) === */
  function fixRequiredAsterisks() {
    var requiredSpans = document.querySelectorAll('.required');
    
    for (var i = 0; i < requiredSpans.length; i++) {
      var span = requiredSpans[i];
      var parent = span.parentElement;
      
      if (parent.tagName === 'LABEL') continue;
      
      var nextSibling = span.nextElementSibling;
      while (nextSibling && nextSibling.tagName !== 'LABEL') {
        nextSibling = nextSibling.nextElementSibling;
      }
      
      if (nextSibling && nextSibling.tagName === 'LABEL') {
        var label = nextSibling;
        label.appendChild(document.createTextNode(' '));
        span.classList.add('dv-required-inline');
        label.appendChild(span);
      } else {
        var formGroup = span.closest('.pf-c-form__group, .form-group, .kc-form-group');
        if (formGroup) {
          var label = formGroup.querySelector('label');
          if (label && !label.contains(span)) {
            label.appendChild(document.createTextNode(' '));
            span.classList.add('dv-required-inline');
            label.appendChild(span);
          }
        }
      }
    }
    
    hideRequiredGlobalMessage();
  }

  /* === Live Password Validation v4 === */
  function setupLivePasswordValidation() {
    // Find password fields
    var fields = findPasswordFields();
    var passwordInput = fields.password;
    
    // Only apply to registration or password update pages
    if (!passwordInput) return;
    if (!isRegisterPage() && !isPasswordUpdatePage()) return;
    
    var confirmInput = fields.confirm;
    var usernameInput = fields.username;
    var emailInput = fields.email;
    
    // Create password rules container
    var passwordContainer = passwordInput.closest('.pf-c-form__group') || passwordInput.parentElement;
    if (!passwordContainer) return;
    
    // Remove existing rules if already exists
    var existingRules = passwordContainer.querySelector('.dv-password-rules');
    if (existingRules) {
      existingRules.remove();
    }
    
    // Create rules list
    var rulesList = document.createElement('ul');
    rulesList.className = 'dv-password-rules';
    rulesList.setAttribute('aria-live', 'polite');
    rulesList.setAttribute('aria-atomic', 'false');
    
    // Check if username/email are available for validation
    var hasUsername = usernameInput && usernameInput.value.trim();
    var hasEmail = emailInput && emailInput.value.trim();
    
    // Define the rules based on Keycloak realm policy
    var rules = [
      { id: 'length', label: 'Pelo menos 10 caracteres', check: function(value) { return value.length >= 10; } },
      { id: 'lowercase', label: 'Pelo menos 1 letra minúscula', check: function(value) { return /[a-z]/.test(value); } },
      { id: 'uppercase', label: 'Pelo menos 1 letra maiúscula', check: function(value) { return /[A-Z]/.test(value); } },
      { id: 'digit', label: 'Pelo menos 1 número', check: function(value) { return /\d/.test(value); } },
      { id: 'special', label: 'Pelo menos 1 caractere especial', check: function(value) { return /[^A-Za-z0-9]/.test(value); } }
    ];
    
    // Add username rule - only check if username exists in form
    rules.push({
      id: 'not-username',
      label: 'Não pode conter seu nome de usuário',
      check: function(value) {
        if (!hasUsername) return true; // Can't validate without username
        var username = usernameInput.value.trim().toLowerCase();
        return !value.toLowerCase().includes(username);
      },
      isInfoOnly: function() { return !hasUsername; }
    });
    
    // Add email rule - only check if email exists in form
    rules.push({
      id: 'not-email',
      label: 'Não pode conter seu e-mail',
      check: function(value) {
        if (!hasEmail) return true; // Can't validate without email
        var email = emailInput.value.trim().toLowerCase();
        var usernamePart = email.split('@')[0];
        return !value.toLowerCase().includes(email) && !value.toLowerCase().includes(usernamePart);
      },
      isInfoOnly: function() { return !hasEmail; }
    });
    
    // Not recently used - always info only (validated server-side)
    rules.push({
      id: 'not-recently-used',
      label: 'Não pode ser uma das 3 últimas senhas (validado no envio)',
      check: function(value) { return true; },
      isInfoOnly: function() { return true; }
    });
    
    // Create rule elements
    var ruleElements = [];
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      var li = document.createElement('li');
      li.className = 'dv-password-rule';
      li.id = 'dv-password-rule-' + rule.id;
      li.textContent = rule.label;
      li.setAttribute('data-rule', rule.id);
      
      // Mark info-only rules
      if (rule.isInfoOnly && rule.isInfoOnly()) {
        li.classList.add('dv-password-rule--info');
      }
      
      rulesList.appendChild(li);
      ruleElements.push({ element: li, check: rule.check, isInfoOnly: rule.isInfoOnly });
    }
    
    // Insert rules after the password input group
    var inputGroup = passwordInput.closest('.pf-c-input-group');
    if (inputGroup && inputGroup.parentNode) {
      inputGroup.parentNode.insertBefore(rulesList, inputGroup.nextSibling);
    } else {
      passwordContainer.appendChild(rulesList);
    }
    
    // Create confirmation error message if needed
    if (confirmInput) {
      var confirmContainer = confirmInput.closest('.pf-c-form__group') || confirmInput.parentElement;
      if (confirmContainer) {
        // Remove existing error if already exists
        var existingConfirmError = confirmContainer.querySelector('.dv-live-field-error');
        if (existingConfirmError) {
          existingConfirmError.remove();
        }
        
        // Create confirmation error element
        var confirmError = document.createElement('div');
        confirmError.className = 'dv-live-field-error';
        confirmError.id = 'dv-confirm-error';
        confirmError.textContent = 'A senha de confirmação não coincide.';
        confirmError.hidden = true;
        
        var confirmGroup = confirmInput.closest('.pf-c-input-group');
        if (confirmGroup && confirmGroup.parentNode) {
          confirmGroup.parentNode.insertBefore(confirmError, confirmGroup.nextSibling);
        } else {
          confirmContainer.appendChild(confirmError);
        }
      }
    }
    
    // Update rules function
    function updatePasswordRules() {
      var passwordValue = passwordInput.value;
      
      // Update hasUsername/hasEmail status
      hasUsername = usernameInput && usernameInput.value.trim();
      hasEmail = emailInput && emailInput.value.trim();
      
      // Show rules if password has focus or has any value
      var shouldShow = passwordValue.length > 0 || document.activeElement === passwordInput;
      rulesList.hidden = !shouldShow;
      
      // Update each rule
      for (var j = 0; j < ruleElements.length; j++) {
        var rule = ruleElements[j];
        var isInfo = rule.isInfoOnly && rule.isInfoOnly();
        var isValid = rule.check(passwordValue);
        
        rule.element.classList.remove('dv-password-rule--valid', 'dv-password-rule--invalid');
        
        if (isInfo) {
          // Info-only rule - always neutral
          rule.element.classList.add('dv-password-rule--info');
        } else if (passwordValue.length === 0) {
          // Empty password - neutral state
          rule.element.classList.remove('dv-password-rule--valid', 'dv-password-rule--invalid');
        } else {
          rule.element.classList.add(isValid ? 'dv-password-rule--valid' : 'dv-password-rule--invalid');
        }
      }
      
      // Update aria-invalid on password input
      if (passwordValue.length > 0) {
        var hasInvalidRules = ruleElements.some(function(r, idx) {
          if (ruleElements[idx].isInfo && ruleElements[idx].isInfo()) return false;
          return !r.check(passwordValue);
        });
        
        if (hasInvalidRules) {
          passwordInput.setAttribute('aria-invalid', 'true');
        } else {
          var hasServerError = document.querySelector('.dv-field-error-below[data-field="password"], .pf-c-form__helper-text.pf-m-error[data-field="password"]');
          if (!hasServerError) {
            passwordInput.removeAttribute('aria-invalid');
          }
        }
      } else {
        passwordInput.removeAttribute('aria-invalid');
      }
      
      // Update confirmation
      updateConfirmation();
    }
    
    // Update confirmation function
    function updateConfirmation() {
      if (!confirmInput) return;
      
      var passwordValue = passwordInput.value;
      var confirmValue = confirmInput.value;
      var confirmError = document.getElementById('dv-confirm-error');
      
      if (!confirmError) return;
      
      // Only show error if both fields have values and they don't match
      if (passwordValue.length > 0 && confirmValue.length > 0 && passwordValue !== confirmValue) {
        confirmError.hidden = false;
        confirmInput.setAttribute('aria-invalid', 'true');
      } else {
        confirmError.hidden = true;
        confirmInput.removeAttribute('aria-invalid');
      }
    }
    
    // Set up event listeners
    passwordInput.addEventListener('input', updatePasswordRules);
    passwordInput.addEventListener('focus', function() {
      rulesList.hidden = false;
      updatePasswordRules();
    });
    
    passwordInput.addEventListener('blur', function() {
      if (passwordInput.value.length === 0) {
        rulesList.hidden = true;
      }
    });
    
    if (usernameInput) {
      usernameInput.addEventListener('input', updatePasswordRules);
      usernameInput.addEventListener('change', updatePasswordRules);
    }
    
    if (emailInput) {
      emailInput.addEventListener('input', updatePasswordRules);
      emailInput.addEventListener('change', updatePasswordRules);
    }
    
    if (confirmInput) {
      confirmInput.addEventListener('input', updateConfirmation);
      confirmInput.addEventListener('change', updateConfirmation);
    }
    
    // Initial update
    updatePasswordRules();
  }

  /* === Normalize Field Errors Layout === */
  function normalizeFieldErrorsLayout() {
    var errorElements = document.querySelectorAll(
      '.pf-c-form__helper-text.pf-m-error, ' +
      '.kc-feedback-text, ' +
      '[id*="input-error"], ' +
      '[id*="error"][role="alert"]'
    );
    
    for (var i = 0; i < errorElements.length; i++) {
      var error = errorElements[i];
      
      if (error.classList.contains('dv-field-error-below')) continue;
      
      var inputId = error.id.replace('-error', '');
      var input = document.getElementById(inputId);
      
      if (!input) {
        var inputs = document.querySelectorAll('[aria-describedby*="' + error.id + '"]');
        if (inputs.length > 0) {
          input = inputs[0];
        }
      }
      
      if (!input) continue;
      
      var inputGroup = input.closest('.pf-c-input-group');
      var formGroup = input.closest('.pf-c-form__group');
      
      if (!inputGroup && !formGroup) continue;
      
      var parent = error.parentElement;
      var isInGoodPosition = false;
      
      if (parent) {
        if (inputGroup && parent === inputGroup.parentElement) {
          var inputGroupIndex = Array.from(parent.children).indexOf(inputGroup);
          var errorIndex = Array.from(parent.children).indexOf(error);
          isInGoodPosition = errorIndex > inputGroupIndex;
        }
        
        if (!isInGoodPosition && inputGroup && parent === inputGroup) {
          var inputIndex = Array.from(parent.children).indexOf(input);
          var errorIndex = Array.from(parent.children).indexOf(error);
          isInGoodPosition = errorIndex > inputIndex;
        }
      }
      
      if (isInGoodPosition) {
        error.classList.add('dv-field-error-below');
        continue;
      }
      
      var targetParent = inputGroup || formGroup;
      var targetInsertAfter = inputGroup || input;
      
      if (!targetParent || !targetInsertAfter) continue;
      
      var errorClone = error.cloneNode(true);
      errorClone.classList.add('dv-field-error-below');
      
      error.classList.add('dv-error-cleared');
      error.hidden = true;
      error.setAttribute('aria-hidden', 'true');
      
      if (targetInsertAfter.parentNode) {
        targetInsertAfter.parentNode.insertBefore(errorClone, targetInsertAfter.nextSibling);
      }
    }
    
    var labelsWithErrors = document.querySelectorAll('label .pf-c-form__helper-text.pf-m-error, label .kc-feedback-text');
    for (var j = 0; j < labelsWithErrors.length; j++) {
      var labelError = labelsWithErrors[j];
      var label = labelError.closest('label');
      
      if (!label) continue;
      
      var inputId = label.getAttribute('for');
      var input = inputId ? document.getElementById(inputId) : null;
      
      if (!input) {
        var formGroup = label.closest('.pf-c-form__group');
        if (formGroup) {
          input = formGroup.querySelector('input, textarea, select');
        }
      }
      
      if (!input) continue;
      
      var errorClone = labelError.cloneNode(true);
      errorClone.classList.add('dv-field-error-below');
      
      labelError.classList.add('dv-error-cleared');
      labelError.hidden = true;
      labelError.setAttribute('aria-hidden', 'true');
      
      var inputGroup = input.closest('.pf-c-input-group');
      var insertAfter = inputGroup || input;
      
      if (insertAfter.parentNode) {
        insertAfter.parentNode.insertBefore(errorClone, insertAfter.nextSibling);
      }
    }
  }

})();