/* DescontoVivo – Auth UI Enhancements */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    injectTopbar();
    detectRegisterPage();
    setupPasswordToggles();
    fixRequiredAsterisks();
    setupFieldErrorCleanup();
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
        
        // Keep the native toggle functionality by listening for click
        // The native Keycloak script will handle the actual toggling
      }
      
      // Update aria-label for better accessibility
      nativeBtn.setAttribute('aria-label', 'Mostrar senha');
      
      // Also enhance the input to remove its right border
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
    // Target all password inputs in registration and password update forms
    var passwordInputs = document.querySelectorAll('input[type="password"]');
    
    for (var i = 0; i < passwordInputs.length; i++) {
      (function (input) {
        function clearFieldError() {
          // 1. Clear aria-invalid from input
          input.removeAttribute('aria-invalid');
          
          // 2. Remove error classes from input
          input.classList.remove('pf-m-error', 'input-error', 'is-invalid');
          
          // 3. Find the closest PatternFly form group
          var formGroup = input.closest('.pf-c-form__group');
          if (!formGroup) {
            formGroup = input.closest('.form-group, .kc-form-group');
          }
          
          if (formGroup) {
            // 4. Remove error classes from form group
            formGroup.classList.remove('pf-m-error');
            
            // 5. Find and hide error messages within this form group
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
            
            // 6. Also check within .pf-c-input-group if present
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
          
          // 7. Handle aria-describedby references
          var describedBy = input.getAttribute('aria-describedby');
          if (describedBy) {
            var ids = describedBy.split(/\s+/);
            var validIds = [];
            
            for (var l = 0; l < ids.length; l++) {
              var element = document.getElementById(ids[l]);
              if (element) {
                // Check if this is an error element
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
        
        // Also clear on focus (user starts editing)
        input.addEventListener('focus', function() {
          // Small delay to ensure user has started typing
          setTimeout(clearFieldError, 100);
        });
      })(passwordInputs[i]);
    }
  }

  /**
   * Visually hides an error element without removing it from the DOM,
   * preserving Keycloak's server-side rendering while clearing stale state.
   */
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
    // Check by body class
    if (document.body.classList.contains('dv-page-register')) return true;
    
    // Check by URL path
    var href = window.location.href.toLowerCase();
    if (href.includes('registration') || href.includes('registrations')) return true;
    
    // Check by form ID
    if (document.getElementById('kc-register-form')) return true;
    
    // Check by form action attribute
    var forms = document.querySelectorAll('form');
    for (var i = 0; i < forms.length; i++) {
      var action = (forms[i].getAttribute('action') || '').toLowerCase();
      if (action.includes('registration')) return true;
    }
    
    return false;
  }

  /* === Hide the global required field message on registration page === */
  function hideRequiredGlobalMessage() {
    // Only hide on registration page
    if (!isRegisterPage()) return;
    
    // List of all possible required field messages
    var requiredMessages = [
      'indica campo obrigatório',
      'indica campo obrigatorio',
      '* indica campo obrigatório',
      '* indica campo obrigatorio',
      'indicates required field',
      '* indicates required field'
    ];
    
    // Elements where the message could appear
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
    
    // Process each candidate element
    for (var k = 0; k < candidates.length; k++) {
      var el = candidates[k];
      if (!el || !el.textContent) continue;
      
      var normalizedText = normalizeText(el.textContent);
      
      // Check if this element contains one of the required messages
      var isRequiredMessage = false;
      for (var m = 0; m < requiredMessages.length; m++) {
        if (normalizedText === normalizeText(requiredMessages[m])) {
          isRequiredMessage = true;
          break;
        }
      }
      
      if (isRequiredMessage) {
        // Mark for CSS
        el.classList.add('dv-required-global-message');
        
        // Apply multiple hiding techniques
        el.hidden = true;
        el.setAttribute('aria-hidden', 'true');
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.height = '0';
        el.style.margin = '0';
        el.style.padding = '0';
        el.style.fontSize = '0';
        el.style.opacity = '0';
        
        // Remove any text content to ensure it's hidden
        if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
          el.textContent = '';
        }
      }
    }
  }

  /* === Required Asterisks (inline fix) === */
  function fixRequiredAsterisks() {
    // Find all required asterisks in the form
    var requiredSpans = document.querySelectorAll('.required');
    
    // Process each required span
    for (var i = 0; i < requiredSpans.length; i++) {
      var span = requiredSpans[i];
      var parent = span.parentElement;
      
      // Skip if already inside a label
      if (parent.tagName === 'LABEL') continue;
      
      // Look for the associated label - it should be the next sibling element
      var nextSibling = span.nextElementSibling;
      while (nextSibling && nextSibling.tagName !== 'LABEL') {
        nextSibling = nextSibling.nextElementSibling;
      }
      
      if (nextSibling && nextSibling.tagName === 'LABEL') {
        // Found the label - move the asterisk inside
        var label = nextSibling;
        label.appendChild(document.createTextNode(' '));
        span.classList.add('dv-required-inline');
        label.appendChild(span);
      } else {
        // Fallback: search within the same form group
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
    
    // Also hide the global required field message
    hideRequiredGlobalMessage();
  }
})();
