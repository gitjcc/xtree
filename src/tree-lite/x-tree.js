;
(function ($) {

    window.xTree = function (options) {
        return new tree(options);
    };

    var defOpt = {
        dom: '', //jqueryDom
        zIndex: 9,
        expand: false, //是否展开，false、true、num, (0、false,都展开ROOT级。true,完全展开。num>=1时，展开到对应级）
        width: null,
        maxHeight: 300,
        data: [], //{id:1,name:'xx',nodeId:'0',is_node:true,is_check:false},
        onInit: function () {},
        onBeforeOpen: function () {},
        onOpen: function () {},
        onClose: function () {},
        onExpand: function () {},
        onIcon: function () {},
        onText: function () {},
        onMenu: function () {},
    };
    var defState = {
        _is_open: false, //是否open
    };

    var tree = function (opt) {
        this._init(opt);
        return this;
    };

    tree.prototype = {
        _init: function (opt) {
            var res = this._validateOpt(opt);
            if (!res) {
                return false;
            }

            this.opt = $.extend(true, {}, defOpt, opt);
            this.state = defState;

            this.$dom = this.opt.dom;
            this.$dom.css({
                'position': 'relative',
                zIndex: this.opt.zIndex,
            });

            this.tree = this._arrayToTree(this.opt.data);

            this.$dom.append(this._makeTree(this.tree));

            this.opt.onInit.apply(this);

            var that = this;
            that.show();
        },

        /**
         *      方法
         *
         */
        show: function () {
            this.opt.onBeforeOpen.apply(this);
            this._showTree();
            this.state._is_open = true;
            this.opt.onOpen.apply(this);
            return this;
        },
        hide: function () {
            if (this.state._is_open) {
                this._hideTree();
                this.state._is_open = false;
                this.opt.onClose.apply(this);
            }
        },

        setIcon: function name(id, iconClass) {
            var item = this._getItemById(this.opt.data, id)
            item.$icon.removeClass();
            item.$icon.addClass('iconfont ' + iconClass);
            return true;
        },

        /**
         *      数据方法
         */
        _validateOpt: function (opt) {
            for (var i in opt.data) {
                if (typeof opt.data[i] !== 'object') {
                    return false;
                }
                if (opt.data[i].id === undefined) {
                    return false;
                }
            }
            return true;
        },

        _arrayToTree: function (arrayIn) {
            var rootId = this._getTreeRoot(arrayIn);
            var treeData = {
                id: rootId,
                name: 'ROOT',
                nodeId: null,
                is_node: true,
                children: [],
                parent: null,
                level: 0,
                expand: true,
                amount: arrayIn.length
            };
            treeData.children = this._getSubTree(arrayIn, treeData);
            return treeData;
        },
        _getTreeRoot: function (arrayIn) {
            var rootId = [];
            var clone = JSON.parse(JSON.stringify(arrayIn));
            for (var i = 0, len = arrayIn.length; i < len; i++) {
                for (var j = i; j < len; j++) {
                    if (arrayIn[i].id == arrayIn[j].nodeId) {
                        clone[j] = null;
                    }
                    if (arrayIn[i].nodeId == arrayIn[j].id) {
                        clone[i] = null;
                    }
                }
            }

            for (var k = 0; k < clone.length; k++) {
                if (clone[k]) {
                    rootId.push(clone[k].nodeId);
                }
            }
            rootId = this._uniqueArray(rootId);

            if (rootId.length > 1) {
                console.log('warning: rootId不唯一', rootId);
            } else if (rootId.length <= 0) {
                console.log('warning: 没有rootId', rootId);
            }

            return rootId[0];
        },
        _uniqueArray: function (arrayIn) {
            var ua = [];
            for (var i = 0; i < arrayIn.length; i++) {
                if ($.inArray(arrayIn[i], ua) == -1) {
                    ua.push(arrayIn[i]);
                }
            }
            return ua;
        },
        _getSubTree: function (arrayIn, parent) {
            var result = [];
            var temp = {};
            for (var i = 0; i < arrayIn.length; i++) {
                if (arrayIn[i].nodeId == parent.id) {
                    temp = arrayIn[i];
                    temp.parent = parent;
                    temp.level = parent.level + 1;
                    temp.expand = true;
                    if (temp.is_node) {
                        temp.children = this._getSubTree(arrayIn, temp);
                    } else {
                        temp.children = [];
                    }
                    result.push(temp);
                }
            }
            return result;
        },

        _getItemById: function (data, id) {
            for (var i = 0; i < data.length; i++) {
                if (data[i].id == id) {
                    return data[i];
                }
            }
            return false;
        },

        _traverseTree: function (tree, fn, input, output) {
            if (!tree) {
                return true;
            }
            var _continue = fn.call(this, tree, input, output); //是否继续遍历
            if (_continue.children && tree.children) {
                for (var i = 0; i < tree.children.length; i++) {
                    var brother = this._traverseTree(tree.children[i], fn, input, output);
                    if (!brother) {
                        break;
                    }
                }
            }
            return _continue.brother;
        },

        /**
         *  视图：构造Tree、 item、 self、 children
         */

        _makeTree: function (tree) {
            tree.$dom = this._makeTreeWrap(tree);
            tree.$self = this._makeSelfWrap(tree);
            tree.$children = this._makeChildrenWrap(tree);
            tree.$dom.append(tree.$self, tree.$children);
            if (tree.is_node && tree.children && tree.children.length) {
                for (var i = 0; i < tree.children.length; i++) {
                    tree.$children.append(this._makeTreeFn(tree.children[i]));
                }
            }
            tree.$self.hide();
            tree.$dom.hide();
            return tree.$dom;
        },
        _makeTreeFn: function (item) {
            var $item = this._makeItem(item);
            if (item.is_node && item.children && item.children.length) {
                for (var i = 0; i < item.children.length; i++) {
                    item.$children.append(this._makeTreeFn(item.children[i]));
                }
            }
            return $item;
        },
        _makeTreeWrap: function (item) {
            var $html = $('<div class="x-tree-root"></div>');
            $html.css({
                'font-family': 'Microsoft YaHei',
                'background': '#fff',
                maxHeight: this.opt.maxHeight,
                padding: '0 1%',
                'white-space': 'nowrap',
                'overflow': 'auto',
                'font-size': '14px',
                'user-select': 'none',
                '-webkit-user-select': 'none',
                '-moz-user-select': 'none',
                '-ms-user-select': 'none'
            });
            return $html;
        },
        _makeItem: function (item) {
            if (!item) {
                return false;
            }

            var $item = this._makeItemWrap(item);
            var $self = this._makeSelfWrap(item);
            var $children = this._makeChildrenWrap(item);

            var $expand = this._makeExpand(item);
            var $icon = this._makeIcon(item);
            var $text = this._makeText(item);
            var $menu = this._makeMenu(item);

            $self.append($expand, $icon, $text, $menu);
            $item.append($self, $children);

            item.$item = $item;
            item.$self = $self;
            item.$children = $children;
            item.$expand = $expand
            item.$icon = $icon
            item.$text = $text
            item.$menu = $menu

            return $item;
        },
        _makeItemWrap: function (item) {
            var $itemWrap = $('<div class="x-tree-item" ></div>');
            $itemWrap.attr({
                'node-id': item.nodeId,
                'data-id': item.id
            });
            if (item.is_node) {
                $itemWrap.addClass('x-tree-node-' + item.id);
            } else {
                $itemWrap.addClass('x-tree-leaf-' + item.id);
            }
            $itemWrap.css({
                cursor: 'pointer'
            });
            return $itemWrap;
        },
        _makeSelfWrap: function (item) {
            var $selfWrap = $('<div></div>');
            $selfWrap.addClass('x-tree-self');
            $selfWrap.on('mouseenter', function (e) {
                $selfWrap.find('.x-tree-item-menu').show();
            });
            $selfWrap.on('mouseleave', function (e) {
                $selfWrap.find('.x-tree-item-menu').hide();
            });
            return $selfWrap;
        },
        _makeChildrenWrap: function (item) {
            var $html = $('<div class="x-tree-children"></div>');
            if (item.level !== 0) {
                $html.css({
                    'margin-left': '16px'
                });
            }
            if (item.level > this.opt.expand) {
                item.expand = false;
                $html.hide();
            }
            return $html;
        },

        _makeExpand: function (item) {
            var $expand;
            if (item.is_node && item.children && item.children.length) {
                if (item.level > this.opt.expand) {
                    $expand = $('<i class="x-tree-expand iconfont icon-xiangyou2"></i>');
                } else {
                    $expand = $('<i class="x-tree-expand iconfont icon-xiangxia1"></i>');
                }
                var that = this;
                $expand.on('click', function (e) {
                    if ($(this).hasClass('icon-xiangyou2')) {
                        that._showChildren(item);
                    } else {
                        that._hideChildren(item);
                    }
                    that.opt.onExpand.apply(this, item);
                });
            } else {
                $expand = $('<span></span>');
            }
            $expand.css({
                display: 'inline-block',
                'vertical-align': 'base-line',
                'padding-right': '0px',
                'cursor': 'pointer',
                width: '14px',
                height: '14px',
            });
            return $expand;
        },
        _makeIcon: function (item) {
            if (!item) {
                return '';
            }
            var $icon = '';
            if (item.is_node) {
                $icon = $('<i class="iconfont icon-yonghu color-red"></i>');
            } else {
                $icon = $('<i class="iconfont icon-yonghu color-blue"></i>');
            }
            $icon.css({
                'vertical-align': 'base-line',
                'cursor': 'pointer',
            });
            var that = this;
            $icon.on('click', function name(e) {
                that.opt.onIcon.apply(this, item);
            });
            return $icon;
        },
        _makeText: function (item) {
            if (!item) {
                return '';
            }
            var $text = $('<span class="x-tree-item-text"></span>');
            $text.text(item.name + item.id);
            $text.css({
                padding: '0 0 0 5px'
            });
            var that = this;
            $text.on('click', function name(e) {
                that.opt.onText.apply(this, item);
            });
            return $text;
        },
        _makeMenu: function (item) {
            if (!item) {
                return '';
            }
            var $menu = $('<span class="x-tree-item-menu"></span>');
            $menu.text(this.opt.menu);
            $menu.css({
                display: 'none',
                padding: '0 0 0 5px',
                float: 'right',
                color: 'blue',
            });
            var that = this;
            $menu.on('click', function (e) {
                that.opt.onMenu.apply(this, item);
            });
            return $menu;
        },

        /**
         *    视图：显示、隐藏
         */

        _showTree: function () {
            this.tree.$dom.show();
        },
        _hideTree: function () {
            this.tree.$dom.hide();
        },

        _showChildren: function (item) {
            item.expand = true;
            item.$children.show();
            this._updateExpand(item);
        },
        _hideChildren: function (item) {
            item.expand = false;
            item.$children.hide();
            this._updateExpand(item);
        },

        _updateExpand: function (item) {
            if (item.expand) {
                item.$expand.removeClass('icon-xiangyou2');
                item.$expand.addClass('icon-xiangxia1');
            } else {
                item.$expand.removeClass('icon-xiangxia1');
                item.$expand.addClass('icon-xiangyou2');
            }
        },
    };

})(jQuery);