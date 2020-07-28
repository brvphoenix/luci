'use strict';
'require fs';
'require uci';
'require view';

return view.extend({
	load: function() {
		return uci.load('aria2').then(function() {
			var config_dir = uci.get_first('aria2', 'aria2', 'config_dir') || '/var/etc/aria2';
			var config_file = '%s/aria2.conf.main'.format(config_dir);
			var session_file = '%s/aria2.session.main'.format(config_dir);

			return Promise.all([
				fs.exec_direct('/bin/cat', [ config_file ]).then(function(res) {
					return {
						'file': config_file,
						'rows': res.trim().split(/\n/).length,
						'content': res.trim()
					}
				}),
				fs.exec_direct('/bin/cat', [ session_file ]).then(function(res) {
					return {
						'file': session_file,
						'rows': res.trim().split(/\n/).length,
						'content': res.trim()
					}
				})
			]);
		})
	},

	render: function(data) {
		return E('div', {'class': 'cbi-map'}, [
			E('h2', {'name': 'content'}, '%s - %s'.format(_('Aria2'), _('Files'))),
			E('div', {'class': 'cbi-map-descr'}, _('Here shows the files used by aria2.')),
			E('div', {'class': 'cbi-section'}, [
				E('div', {'class': 'cbi-section-descr'},
					_('Content of config file: <code>%s</code>').format(data[0].file)
				),
				E('textarea', {
					'id': 'custom_config',
					'style': 'width: 100%',
					'readonly': true,
					'wrap': 'off',
					'rows': data[0].rows > 20 ? 20 : data[0].rows + 1
				}, data[0].content)
			]),
			E('div', {'class': 'cbi-section'}, [
				E('div', {'class': 'cbi-section-descr'},
					_('Content of session file: <code>%s</code>').format(data[1].file)
				),
				E('textarea', {
					'id': 'custom_config',
					'style': 'width: 100%',
					'readonly': true,
					'wrap': 'off',
					'rows': data[1].rows > 20 ? 20 : data[1].rows + 1
				}, data[1].content)
			])
		]);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
})
