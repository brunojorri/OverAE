/* Minimal CEP bridge used by this panel. Adobe's full CSInterface library may be substituted during packaging. */
function CSInterface() {}
CSInterface.prototype.evalScript = function(script, callback) { window.__adobe_cep__.evalScript(script, callback); };
