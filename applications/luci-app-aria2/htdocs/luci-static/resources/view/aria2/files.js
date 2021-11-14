'use strict';
'require fs';
'require uci';
'require view';

return view.extend({
	load: function() {
		return uci.load('aria2').then(function() {
			var config_dir = uci.get_first('aria2', 'aria2', 'config_dir') || '/var/etc/aria2',
			    list_files = ['conf', 'session'],
			    actions = [];
			for (var index = 0; index < list_files.length; ++index) {
				var list_file = '%s/aria2.%s.main'.format(config_dir, list_files[index]);
				actions.push(
					fs.exec_direct('/usr/libexec/aria2-call', [ 'cat', list_file ])
					.then(L.bind(function(file, res) {
						return {
							'file': file,
							'rows': res.trim().split(/\n/).length,
							'content': res.trim()
						}
					}, this, list_file))
				);
			}
			return Promise.all(actions);
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
});
