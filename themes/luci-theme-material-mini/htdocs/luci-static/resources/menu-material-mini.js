'use strict';
'require baseclass';
'require ui';

return baseclass.extend({
	__init__: function() {
		ui.menu.load().then(L.bind(this.render, this));
	},

	render: function(tree) {
		var node = tree,
		    url = '';

		this.renderModeMenu(node);

		if (L.env.dispatchpath.length >= 3) {
			for (var i = 0; i < 3 && node; i++) {
				node = node.children[L.env.dispatchpath[i]];
				url = url + (url ? '/' : '') + L.env.dispatchpath[i];
			}

			if (node)
				this.renderTabMenu(node, url);
		}

		this.registerEvent();
	},

	handleMenuExpand: function(ev) {
		var a = ev.target, li1 = a.parentNode, ul2 = a.nextElementSibling;

		if (!ul2)
			return;

		if (li1.classList.contains('active')) {
			li1.classList.remove('active');
		}
		else {
			li1.classList.add('active');
		}
		a.blur();

		ev.preventDefault();
		ev.stopPropagation();
	},

	renderMainMenu: function(tree, url, level) {
		var l = (level || 0) + 1,
		    ul = E('ul', { 'class': level ? 'slide-menu' : 'nav' }),
		    children = ui.menu.getChildren(tree);

		if (children.length == 0 || l > 2)
			return E([]);

		for (var i = 0; i < children.length; i++) {
			var isActive = (L.env.dispatchpath[l] == children[i].name),
			    isReadonly = children[i].readonly,
			    activeClass = isActive ? 'active' : null;

			ul.appendChild(E('li', { 'class':  activeClass }, [
				E('a', {
					'href': L.url(url, children[i].name),
					'class': l < 2 ? 'menu' : null,
					'click': (l == 1) ? ui.createHandlerFn(this, 'handleMenuExpand') : null,
					'data-title': l < 2 ? null : _(children[i].title),
					}, [ _(children[i].title) ]
				),
				this.renderMainMenu(children[i], url + '/' + children[i].name, l)
			]));
		}

		if (l == 1)
			document.querySelector('#mainmenu').appendChild(ul);

		return ul;
	},

	renderModeMenu: function(tree) {
		var menu = document.querySelector('#modemenu'),
		    children = ui.menu.getChildren(tree);

		for (var i = 0; i < children.length; i++) {
			var isActive = (L.env.requestpath.length ? children[i].name == L.env.requestpath[0] : i == 0);

			if (i > 0)
				menu.appendChild(E([], ['\u00a0|\u00a0']));

			menu.appendChild(E('div', { 'class': isActive ? 'active' : null }, [
				E('a', { 'href': L.url(children[i].name) }, [ _(children[i].title) ])
			]));

			if (isActive)
				this.renderMainMenu(children[i], children[i].name);
		}

		if (menu.children.length > 1)
			menu.style.display = '';
	},

	renderTabMenu: function(tree, url, level) {
		var container = document.querySelector('#tabmenu'),
		    l = (level || 0) + 1,
		    ul = E('ul', { 'class': 'cbi-tabmenu' }),
		    children = ui.menu.getChildren(tree),
		    activeNode = null;

		if (children.length == 0)
			return E([]);

		for (var i = 0; i < children.length; i++) {
			var isActive = (L.env.dispatchpath[l + 2] == children[i].name),
			    activeClass = isActive ? ' cbi-tab' : '',
			    className = 'tabmenu-item-%s %s'.format(children[i].name, activeClass);

			ul.appendChild(E('li', { 'class': className }, [
				E('a', { 'href': L.url(url, children[i].name) }, [ _(children[i].title) ] )
			]));

			if (isActive)
				activeNode = children[i];
		}

		container.appendChild(ul);
		container.style.display = '';

		if (activeNode)
			container.appendChild(this.renderTabMenu(activeNode, url + '/' + activeNode.name, l));

		return ul;
	},

	handleSidebarToggle: function(ev) {
		var btn = ev.currentTarget,
		    bar = document.querySelector('#mainmenu'),
		    mask = document.querySelector(".darkMask"),
		    main = document.querySelector(".main-right");

		if (btn.classList.contains('active')) {
			btn.classList.remove('active');
			bar.classList.remove('active');
			mask.classList.remove('active');
			main.classList.remove('active');
		}
		else {
			btn.classList.add('active');
			bar.classList.add('active');
			mask.classList.add('active');
			main.classList.add('active');
		}
	},

	registerEvent: function() {
		document.querySelector('#menubar > .navigation')
			.addEventListener('click', ui.createHandlerFn(this, 'handleSidebarToggle'));

		window.onresize = function () {
			if (window.innerWidth > 921) {
				document.querySelector('h2.navigation').classList.remove('active');
				document.querySelector('#mainmenu').classList.remove('active');
				document.querySelector(".darkMask").classList.remove('active');
				document.querySelector(".main-right").classList.remove('active');
			}
		};

		document.querySelector(".darkMask").addEventListener('click', function () {
			if (this.classList.contains('active')) {
				document.querySelector('h2.navigation').classList.remove('active');
				document.querySelector('#mainmenu').classList.remove('active');
				this.classList.remove('active');
				document.querySelector(".main-right").classList.remove('active');
			}
		});
	}
});

