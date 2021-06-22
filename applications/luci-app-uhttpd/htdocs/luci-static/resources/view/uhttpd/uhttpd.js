'use strict';
'require form';
'require fs';
'require rpc';
'require uci';
'require view';

var getHostname = rpc.declare({
	object: 'system',
	method: 'board',
	params: [],
	expect: { 'hostname': '' }
});

var callSetInitAction = rpc.declare({
	object: 'luci',
	method: 'setInitAction',
	params: [ 'name', 'action' ],
	expect: { 'result': false }
});

var validateVal = function(section_id, value) {
	if (this.section.formvalue(section_id, 'listen_http').length > 0 || this.section.formvalue(section_id, 'listen_https').length > 0)
		return true;
	else
		return _('Must listen on at least one address:port');
}

var deleteOld = function(ev, section_id) {
	fs.exec_direct('/usr/libexec/uhttpd-exec', ['rm'])
	.then(function() {
		return callSetInitAction('uhttpd', 'restart');
	})
	.then(reloadPage, reloadPage);
}

var deleteConf = function(ev, section_id) {
	return Promise.all([
		uci.unset_first('uhttpd', 'uhttpd', 'cert'),
		uci.unset_first('uhttpd', 'uhttpd', 'key'),
		uci.unset_first('uhttpd', 'uhttpd', 'listen_https')
	])
	.then(function() {
		fs.exec_direct('/usr/libexec/uhttpd-exec', ['rm']);
	})
	.then(this.handleSaveApply.bind(this, ev, true));;
}

var reloadPage = function() {
	window.open(location.href, '_self');
}

return view.extend({
	load: getHostname,

	render: function(hostname) {
		var m, s, o;

		m = new form.Map('uhttpd', _('uHTTPd'), _('A lightweight single-threaded HTTP(S) server'));

		s = m.section(form.NamedSection, 'main', 'uhttpd', '');
		s.addremove = false;
		s.anonymous = true;

		s.tab('general', _('General Settings'));
		s.tab('server', _('Full Web Server Settings'), _('For settings primarily geared to serving more than the web UI'));
		s.tab('advanced', _('Advanced Settings'), _('Settings which are either rarely needed or which affect serving the WebUI'));

		o = s.taboption('general', form.DynamicList, 'listen_http', _('HTTP listeners (address:port)'), _('Bind to specific interface:port (by specifying interface address'));
		o.datatype = 'list(ipaddrport(1))';
		o.validate = validateVal;

		o = s.taboption('general', form.DynamicList, 'listen_https', _('HTTPS listener (address:port)'), _('Bind to specific interface:port (by specifying interface address'));
		o.datatype = 'list(ipaddrport(1))';
		o.validate = validateVal;

		o = s.taboption('general', form.Flag, 'redirect_https', _('Redirect all HTTP to HTTPS'));
		o.default = o.disabled;
		o.depends({'listen_https': /\S+/});

		o = s.taboption('general', form.Flag, 'rfc1918_filter', _('Ignore private IPs on public interface'), _('Prevent access from private (RFC1918) IPs on an interface if it has an public IP address'));
		o.default = o.disabled;

/*		o = s.taboption('general', form.FileUpload, 'cert', _('HTTPS Certificate (DER or PEM format)'));
		o.root_directory = '/etc';
		o.default = '/etc/uhttpd.crt';
		o.depends({'listen_https': /\S+/});

		o = s.taboption('general', form.FileUpload, 'key', _('HTTPS Private Key (DER or PEM format)'));
		o.root_directory = '/etc';
		o.default = '/etc/uhttpd.key';
		o.depends({'listen_https': /\S+/});*/

		o = s.taboption('general', form.Value, 'cert', _('HTTPS Certificate (DER or PEM format)'));
		o.default = '/etc/uhttpd.crt';
		o.depends({'listen_https': /\S+/});
		o.rmempty = false;

		o = s.taboption('general', form.Value, 'key', _('HTTPS Private Key (DER or PEM format)'));
		o.default = '/etc/uhttpd.key';
		o.depends({'listen_https': /\S+/});
		o.rmempty = false;

		o = s.taboption('general', form.Button, 'remove_old', _('Remove old certificate and key'),
				  _('uHTTPd will generate a new self-signed certificate using the configuration shown below.'));
		o.depends({'cert': /\S+/, 'key': /\S+/});
		o.inputstyle = 'remove';
		o.onclick = deleteOld;

		o = s.taboption('general', form.Button, 'remove_conf', _('Remove configuration for certificate and key'),
			_('This permanently deletes the cert, key, and configuration to use same.'));
		o.depends({'cert': /\S+/, 'key': /\S+/});
		o.inputstyle = 'remove';
		o.onclick = deleteConf.bind(this);

		o = s.taboption('server', form.DynamicList, 'index_page', _('Index page(s)'), _('E.g specify with index.html and index.php when using PHP'));
		o.placeholder = 'index.html';

		o = s.taboption('server', form.DynamicList, 'interpreter', _('CGI filetype handler'), _('Interpreter to associate with file endings (\'suffix=handler\', e.g. \'.php=/usr/bin/php-cgi\')'));

		o = s.taboption('server', form.Flag, 'no_symlinks', _('Do not follow symlinks outside document root'));

		o = s.taboption('server', form.Flag, 'no_dirlists', _('Do not generate directory listings.'));
		o.default = o.disabled;

		o = s.taboption('server', form.DynamicList, 'alias', _('Aliases'), _('(/old/path=/new/path) or (just /old/path which becomes /cgi-prefix/old/path)'));

		o = s.taboption('server', form.Value, 'realm', _('Realm for Basic Auth'));
		o.placeholder = hostname || 'OpenWrt';

		o = s.taboption('server', form.Value, 'config', _('Config file (e.g. for credentials for Basic Auth)'), _('Will not use HTTP authentication if not present'));

		o = s.taboption('server', form.Value, 'error_page', _('404 Error'), _('Virtual URL or CGI script to display on status \'404 Not Found\'.  Must begin with \'/\''));

		o = s.taboption('advanced', form.Value, 'home', _('Document root'),
				  _('Base directory for files to be served'));
		o.default = '/www';
		o.datatype = 'directory';

		o = s.taboption('advanced', form.Value, 'cgi_prefix', _('Path prefix for CGI scripts'), _('CGI is disabled if not present.'));

		o = s.taboption('advanced', form.Value, 'lua_prefix', _('Virtual path prefix for Lua scripts'));
		o.placeholder = '/lua';

		o = s.taboption('advanced', form.Value, 'lua_handler', _('Full real path to handler for Lua scripts'), _('Embedded Lua interpreter is disabled if not present.'));

		o = s.taboption('advanced', form.Value, 'ubus_prefix', _('Virtual path prefix for ubus via JSON-RPC integration'), _('ubus integration is disabled if not present'));

		o = s.taboption('advanced', form.Value, 'ubus_socket', _('Override path for ubus socket'));

		o = s.taboption('advanced', form.Flag, 'ubus_cors', _('Enable JSON-RPC Cross-Origin Resource Support'));
		o.default = o.disabled;

		o = s.taboption('advanced', form.Flag, 'no_ubusauth', _('Disable JSON-RPC authorization via ubus session API'));
		o.optional= true;
		o.default = o.disabled;

		o = s.taboption('advanced', form.Value, 'script_timeout', _('Maximum wait time for Lua, CGI, or ubus execution'));
		o.placeholder = 60;
		o.datatype = 'uinteger';

		o = s.taboption('advanced', form.Value, 'network_timeout', _('Maximum wait time for network activity'));
		o.placeholder = 30;
		o.datatype = 'uinteger';

		o = s.taboption('advanced', form.Value, 'http_keepalive', _('Connection reuse'));
		o.placeholder = 20;
		o.datatype = 'uinteger';

		o = s.taboption('advanced', form.Value, 'tcp_keepalive', _('TCP Keepalive'));
		o.datatype = 'uinteger';
		o.default = 1;

		o = s.taboption('advanced', form.Value, 'max_connections', _('Maximum number of connections'));
		o.datatype = 'uinteger';

		o = s.taboption('advanced', form.Value, 'max_requests', _('Maximum number of script requests'));
		o.datatype = 'uinteger';

		s = m.section(form.NamedSection, 'defaults', 'cert', _('uHTTPd Self-signed Certificate Parameters'));
		s.template  = 'cbi/tsection';
		s.anonymous = true;

		o = s.option(form.Value, 'days', _('Valid for # of Days'));
		o.default = 730;
		o.datatype = 'uinteger';

		o = s.option(form.ListValue, 'key_type', _('Type of the key'), _('The valid value is rsa or ec'));
		o.value('ec');
		o.value('rsa');
		o.default = 'ec';

		o = s.option(form.Value, 'bits', _('Length of key in bits'));
		o.default = 2048;
		o.datatype = 'min(1024)';

		o = s.option(form.ListValue, 'ec_curve', _('Type of the ec curve'), _('The valid value is P-256 or P-384'));
		o.value('P-256');
		o.value('P-384');
		o.default = 'P-256';

		o = s.option(form.Value, 'commonname', _('Server Hostname'), _('a.k.a CommonName'));
		o.default = hostname || 'OpenWrt';

		o = s.option(form.Value, 'country', _('Country'));
		o.default = 'ZZ';

		o = s.option(form.Value, 'state', _('State'));
		o.default = 'Unknown';

		o = s.option(form.Value, 'location', _('Location'));
		o.default = 'Unknown';

		return m.render();
	}
});
