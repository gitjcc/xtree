;
(function ($) {
    window.xTree = function (options) {
        return new tree(options);
    };

    var defOpt = {
        dom: '', //jqueryDom
        position: 'absolute',
        is_trigger: false, //是否需要触发? 否则直接显示
        has_search: false,
        searchType: 'all', //'all'全部，'node'节点，'leaf'叶子
        only_child: false, //是否结果只要 child
        node_merge: false, //结果只显示最上层  比如   中国被选中  四川,成都则不会显示  否则 每个被勾选的节点都显示
        zIndex: 99,
        is_multi: true, //是否多选
        expand: false, //是否展开，false、true、num, (0、false,都展开ROOT级。true,完全展开。num>=1时，展开到对应级）
        width: null,
        maxHeight: 300,
        data: [], //{id:1,name:'xx',nodeId:'0',is_node:true,is_check:false},
        sel_ids: '',
        onInit: function () {},
        onBeforeOpen: function () {},
        onOpen: function () {},
        onCheck: function () {},
        onCancel: function () {},
        onChange: function () {},
        onClose: function () {},
    };
    var defState = {
        _is_open: false, //是否open
        _originId: {
            nodeId: [],
            id: []
        }, //上次打开时候选中了哪一些id
        _searchTimer: '' //搜索框的定时器
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
            this.state = $.extend({}, defState);
            this.data = this.opt.data;
            this.tree = this._arrayToTree(this.data);
            this.$tree = this._makeTree(this.tree);

            this.dom = this.opt.dom;
            if (this.opt.position === 'fixed') {
                $('body').append(this.$tree);
            } else {
                this.dom.css({
                    'position': 'relative'
                });
                this.dom.append(this.$tree);
            }

            if (this.opt.sel_ids) {
                if (this.opt.is_multi) {
                    this._checkTreeByIds(this.tree, this.opt.sel_ids);
                } else {
                    this._checkDataRadio(this.data, this.opt.sel_ids);
                }
            }

            this.opt.onInit.apply(this);

            var that = this;
            if (this.opt.is_trigger) {
                this.dom.off('click.xTree');
                this.dom.on('click.xTree', function (e) {
                    if (that.state._is_open && !that.$tree.is(e.target) && that.$tree.has(e.target).length === 0 ) {
                        that.hide();
                    } else {
                        that.show();
                    }
                });
                $(document).on('click.xTree', function (e) {
                    var a = that.dom;
                    var b = that.$tree;
                    if (!a.is(e.target) && a.has(e.target).length === 0 && !b.is(e.target) && b.has(e.target).length === 0) {
                        that.hide();
                    }
                });
            } else {
                that.show();
            }
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
                this.state._originId = this.getId();
                this.state._is_open = false;
                this.opt.onClose.apply(this);
            }
        },

        getId: function () {
            var ids = [];
            var items = this.getItem();

            if (items.length > 0) {
                items.forEach(function (element) {
                    ids.push(element.id);
                }, this);
            }
            return ids;
        },

        getName: function () {
            var names = [];
            var items = this.getItem();

            if (items.length > 0) {
                items.forEach(function (element) {
                    names.push(element.name);
                }, this);
            }
            return names.join();
        },

        getItem: function () {
            var items = [];
            var data = this.data;
            if (this.opt.only_child) {
                $.each(data, function (i, n) {
                    if (n.is_check === true && n.is_node === false) {
                        items.push(n);
                    }
                });
            } else if (this.opt.node_merge) {
                var nodeIds = [];
                $.each(data, function (i, n) {
                    if (n.is_check && n.is_node) {
                        nodeIds.push(n.id);
                    }
                });
                var clone = $.extend(false, [], data);
                $.each(clone, function (i, n) {
                    if (($.inArray(n.nodeId, nodeIds) != -1) || !n.is_check) {
                        clone[i] = null;
                    }
                });
                $.each(clone, function (i, n) {
                    if (n) {
                        items.push(n);
                    }
                });
            } else {
                $.each(data, function (i, n) {
                    if (n.is_check) {
                        items.push(n);
                    }
                });
            }
            return items;
        },

        getIds: function (type) {
            var ids = {}
            var items = this.getItems(type);

            for (key in items) {
                ids[key] = [];
                if (items.hasOwnProperty(key) && items[key].length > 0) {
                    items[key].forEach(function (element) {
                        ids[key].push(element.id);
                    }, this);
                }
            }
            return ids;
        },

        getNames: function (type) {
            var names = {};
            var items = this.getItems(type);

            for (key in items) {
                names[key] = [];
                if (items.hasOwnProperty(key) && items[key].length > 0) {
                    items[key].forEach(function (element) {
                        names[key].push(element.name);
                    }, this);
                }
            }
            return names;
        },

        getItems: function (typeIn) {
            //0、根据this.options
            //'all'、全部；
            //'merge'、合并到节点；
            //'leaf'、仅叶子；
            //'node'、仅节点；
            var type
            var leaf = [];
            var node = [];
            var data = this.data;

            if (!typeIn) {
                if (this.opt.getType) {
                    type = this.opt.getType;
                } else if (this.opt.only_child) {
                    type = 'leaf';
                } else if (this.opt.node_merge) {
                    type = 'merge';
                } else {
                    type = 'all';
                }
            } else {
                type = typeIn;
            }

            switch (type) {
                case 'node': //仅节点
                    $.each(data, function (i, n) {
                        if (n.is_check === true && n.is_node === true) {
                            node.push(n);
                        }
                    });
                    break;

                case 'leaf': //仅叶子
                    $.each(data, function (i, n) {
                        if (n.is_check === true && n.is_node === false) {
                            leaf.push(n);
                        }
                    });
                    break;

                case 'merge': //合并到节点
                    var nodeIds = [];
                    $.each(data, function (i, n) {
                        if (n.is_check === true && n.is_node === true) {
                            nodeIds.push(n.id);
                        }
                    });
                    //节点合并
                    var clone = $.extend(false, [], data); //直接赋值传的是引用
                    $.each(clone, function (i, n) {
                        if (($.inArray(n.nodeId, nodeIds) != -1) || !n.is_check) {
                            clone[i] = null;
                        }
                    });
                    $.each(clone, function (i, n) {
                        if (n && n.is_node === true) {
                            node.push(n);
                        } else if (n && n.is_node === false) {
                            leaf.push(n);
                        }
                    });
                    break;
                case 'all':
                default: //全部
                    $.each(data, function (i, n) {
                        if (n.is_check === true && n.is_node === true) {
                            node.push(n);
                        } else if (n.is_check === true && n.is_node === false) {
                            leaf.push(n);
                        }
                    });
                    break;
            }
            return {
                node: node,
                leaf: leaf
            };
        },

        cancelItem: function (ids, type) {
            if (!Array.isArray(ids)) {
                return "checkItem(),参数ids不是数组";
            }
            var items = this._getItemsByIds(this.data, ids, type);
            for (var i = 0; i < items.length; i++) {
                this._changeItem(items[i], false);
            }
        },
        checkItem: function (ids, type) {
            if (!Array.isArray(ids)) {
                return "checkItem(),参数ids不是数组";
            }
            var items = this._getItemsByIds(this.data, ids, type);
            for (var i = 0; i < items.length; i++) {
                this._changeItem(items[i], true);
            }
        },
        cancelAll: function () {
            for (var i = 0; i < this.data.length; i++) {
                this._changeItem(this.data[i], false);
            }
        },
        checkAll: function () {
            for (var i = 0; i < this.data.length; i++) {
                this._changeItem(this.data[i], true);
            }
        },

        search: function (val) {
            this.tree.$dom.$children.hide();
            if (val === '') {
                this.tree.$dom.$search.empty();
                this.tree.$dom.$children.show();
            } else {
                this.tree.$dom.$search.empty();
                for (var i in this.data) {
                    if (this.opt.searchType == 'all') {
                        if (this.data[i].name.indexOf(val) != -1) {
                            this.tree.$dom.$search.append(this._makeItem(this.data[i]));
                        }
                    } else if (this.opt.searchType == 'node') {
                        if (this.data[i].is_node && this.data[i].name.indexOf(val) != -1) {
                            this.tree.$dom.$search.append(this._makeItem(this.data[i]));
                        }
                    } else if (this.opt.searchType == 'leaf') {
                        if (!this.data[i].is_node && this.data[i].name.indexOf(val) != -1) {
                            this.tree.$dom.$search.append(this._makeItem(this.data[i]));
                        }
                    }
                }
            }
        },

        /**
         *      数据方法
         */

        _validateOpt: function (opt) {
            for (var i in opt.data) {
                if (typeof opt.data[i] !== 'object') {
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
                is_check: false,
                checkState: false,
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
                if (ua.indexOf(arrayIn[i]) == -1) {
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
                    temp.checkState = temp.is_check;
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
        _getItemsByIds: function (data, ids, type) {
            var items = [];
            var data = this.data;
            if (!type || type === 0) {
                for (var i = 0; i < ids.length; i++) {
                    for (var j = 0; j < data.length; j++) {
                        if (data[j].id == ids[i]) {
                            items.push(data[j]);
                        }
                    }
                }
            } else if (type === 1) {
                for (var m = 0; m < ids.length; m++) {
                    for (var n = 0; n < data.length; n++) {
                        if (data[n].id == ids[m] && !data[n].is_node) {
                            items.push(data[n]);
                        }
                    }
                }
            }
            return items;
        },

        _checkDataRadio: function (data, sel_ids) {
            if (!Array.isArray(sel_ids)) {
                var sel_id = sel_ids.split(',');
            }
            for (var j = 0; j < data.length; j++) {
                if (data[j].id == sel_id[0]) {
                    this._changeItem(data[j], true);
                    return false;
                }
            }
            return false;
        },
        _checkItemById: function (data, id) {
            for (var i = 0; i < data.length; i++) {
                if (data[i].id == id) {
                    this._changeItem(data[i], true);
                    return false;
                }
            }
            return false;
        },
        _checkTreeByIds: function (tree, sel_ids) {
            if (!Array.isArray(sel_ids)) {
                var ids = sel_ids.split(',');
            }
            this._traverseTree(tree, this._checkTreeByIdsFn, ids);
        },
        _checkTreeByIdsFn: function (item, ids) {
            if (!ids.length) {
                return {
                    children: false,
                    brother: false
                };
            }
            if (this.opt.only_child) {
                for (var i = 0; i < ids.length; i++) {
                    if (item.id == ids[i] && !item.is_node) {
                        this._changeItem(item, true);
                        ids.splice(i, 1);
                        break;
                    }
                }
            } else {
                for (var j = 0; j < ids.length; j++) {
                    if (item.id == ids[j]) {
                        this._changeItem(item, true);
                        ids.splice(j, 1);
                        break;
                    }
                }
            }
            return {
                children: ids.length,
                brother: ids.length
            };
        },

        _changeItem: function (item, change) {
            if (this.opt.is_multi) {
                this._changeItemMulti(item, change);
            } else {
                this._changeItemRadio(item, change);
            }
            if (change) {
                this.opt.onCheck.apply(this);
            } else {
                this.opt.onCancel.apply(this);
            }
            this.opt.onChange.apply(this);
        },
        _changeItemRadio: function (item, change) {
            if (!item || !change || item.is_check === change) {
                return false;
            }
            for (var i = 0; i < this.data.length; i++) {
                this.data[i].is_check = false;
                this.data[i].checkState = false;
                this._updateCheck(this.data[i]);
            }
            item.is_check = true;
            item.checkState = true;
            this._updateCheck(item);
            return false;
        },
        _changeItemMulti: function (item, change) {
            if (!item || item.is_check === change && change) {
                return false;
            }
            item.is_check = change;
            item.checkState = change;
            this._updateCheck(item);
            if (item.is_node && item.children) {
                this._changeChildren(item.children, change);
                this._changeChildrenState(item.children, change);
            }
            if (item.parent) {
                this._changeParent(item.parent, change);
                this._changeParentState(item.parent, change)
            }
        },
        _changeChildren: function (children, change) {
            if (!children) {
                return false;
            }
            for (var i = 0; i < children.length; i++) {
                if (children[i].is_check != change) {
                    children[i].is_check = change;
                    if (children[i].children) {
                        this._changeChildren(children[i].children, change);
                    }
                }
            }
        },
        _changeParent: function (parent, change) {
            if (!parent || parent.is_check == change) {
                return false;
            }
            if (change) {
                for (var i = 0; i < parent.children.length; i++) {
                    if (!parent.children[i].is_check) {
                        return false;
                    }
                }
            }
            parent.is_check = change;
            if (parent.parent) {
                this._changeParent(parent.parent, change);
            }
        },
        _changeChildrenState: function (children, change) {
            if (!children) {
                return false;
            }
            for (var i = 0; i < children.length; i++) {
                if (children[i].checkState != change) {
                    children[i].checkState = change;
                    this._updateCheck(children[i]);
                    if (children[i].children) {
                        this._changeChildrenState(children[i].children, change);
                    }
                }
            }
            return true;
        },
        _changeParentState: function (parent, change) {
            if (!parent) {
                return false;
            }
            var old = parent.checkState;
            var len = parent.children.length;

            if (change === "z") {
                parent.checkState = "z";
            } else if (change === true) {
                var n = 0;
                for (var i = 0; i < len; i++) {
                    if (parent.children[i].checkState === true) {
                        n += 1;
                    } else {
                        parent.checkState = "z";
                        break;
                    }
                }
                if (n === len) {
                    parent.checkState = true;
                }
            } else if (change === false) {
                var m = 0;
                for (var j = 0; j < len; j++) {
                    if (parent.children[j].checkState === false) {
                        m += 1;
                    } else {
                        parent.checkState = "z";
                        break;
                    }
                }
                if (m === len) {
                    parent.checkState = false;
                }
            }

            this._updateCheck(parent);
            if (parent.parent && parent.checkState !== old) {
                this._changeParentState(parent.parent, parent.checkState);
            }
            return true;
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
            if (this.opt.has_search) {
                tree.$dom.$search = this._makeSearchWrap();
                tree.$dom.append(this._makeSearchInput(), tree.$dom.$search);
            }
            tree.$dom.$self = this._makeSelfWrap(tree);
            tree.$dom.$children = this._makeChildrenWrap(tree);
            tree.$dom.append(tree.$dom.$self, tree.$dom.$children);
            if (tree.is_node && tree.children && tree.children.length) {
                for (var i = 0; i < tree.children.length; i++) {
                    tree.$dom.$children.append(this._makeTreeFn(tree.children[i]));
                }
            }
            tree.$dom.$self.hide();
            tree.$dom.hide();
            return tree.$dom;
        },
        _makeTreeFn: function (item) {
            var $item = this._makeItem(item);
            if (item.is_node && item.children && item.children.length) {
                for (var i = 0; i < item.children.length; i++) {
                    item.$dom.$children.append(this._makeTreeFn(item.children[i]));
                }
            }
            return $item;
        },
        _makeTreeWrap: function (item) {
            var $html = $('<div class="x-tree-root"></div>');
            var style;
            if (this.opt.is_trigger) {
                style = {
                    'font-family': 'Microsoft YaHei',
                    'z-index': this.opt.zIndex,
                    border: '1px solid #5d5d5d',
                    'background': '#fff',
                    position: 'absolute',
                    maxHeight: this.opt.maxHeight,
                    padding: '0 1%',
                    'white-space': 'nowrap',
                    'overflow': 'auto',
                    'font-size': '14px',
                    'user-select': 'none',
                    '-webkit-user-select': 'none',
                    '-moz-user-select': 'none',
                    '-ms-user-select': 'none'
                };
            } else {
                style = {
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
                };
            }

            $html.css(style);

            return $html;
        },
        _makeSearchInput: function (item) {
            var $search = $('<input class="x-tree-search-input" type="text" placeholder="搜索"/></div>');
            $search.css({
                'border': 'none',
                'padding': '4px 0',
                'margin': '5px auto 0 auto',
                'width': '98%',
                'display': 'block'
            });

            var that = this;
            $search.on('keyup paste', function () {
                var input = this;
                clearTimeout(that.state._searchTimer);
                that.state._searchTimer = setTimeout(function () {
                    that.search(input.value);
                }, 100);
            });

            return $search;
        },
        _makeSearchWrap: function (item) {
            var $searchWrap = $('<div></div>');
            $searchWrap.addClass('x-tree-search-result');
            return $searchWrap;
        },
        _makeItem: function (item) {
            if (!item) {
                return false;
            }

            var $item = this._makeItemWrap(item);
            var $self = this._makeSelfWrap(item);
            var $children = this._makeChildrenWrap(item);

            var $expand = this._makeExpand(item);
            var $check = this._makeCheck(item);
            var $folder = this._makeFolder(item);
            var $text = this._makeText(item);

            $self.append($expand, $check, $folder, $text);

            $item.append($self, $children);

            item.$dom = $item;
            item.$dom.$self = $self;
            item.$dom.$children = $children;

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
            return $selfWrap;
        },
        _makeChildrenWrap: function (item) {
            var $html = $('<div class="x-tree-children"></div>');
            $html.css({
                'margin-left': '16px'
            });
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
        _makeCheck: function (item) {
            if (!item) {
                console.log('_makeCheck失败,item不存在', item);
                return '';
            }

            var $check;
            if (item.is_check) {
                $check = $('<i class="x-tree-check iconfont icon-square-check" /i>');
            } else {
                $check = $('<i class="x-tree-check iconfont icon-square" /i>');
            }
            $check.css({
                'vertical-align': 'base-line',
                'padding-right': '0px',
                'cursor': 'pointer',
                'color': '#333',
                width: '14px',
                height: '14px',
            });

            var that = this;
            $check.on('click', function () {
                that._changeItem(item, !item.is_check);
            });
            return $check;
        },
        _makeFolder: function (item) {
            if (!item || !item.is_node) {
                return '';
            }
            var $folder = $('<i class="iconfont icon-folder"></i>');
            $folder.css({
                'vertical-align': 'base-line',
                'padding-right': '0px',
                'cursor': 'pointer',
                'color': '#333',
                width: '14px',
                height: '14px',
            });
            return $folder;
        },
        _makeText: function (item) {
            if (!item) {
                return '';
            }
            var $text = $('<span class="x-tree-item-text"></span>');
            $text.text(item.name);
            $text.css({
                padding: '0 0 0 5px'
            });
            return $text;
        },

        /**
         *    视图：显示、隐藏
         */

        _showTree: function () {
            this.tree.$dom.show();
            if (this.opt.is_trigger) {
                this.tree.$dom.css({
                    top: this.dom.outerHeight(),
                    left: 0,
                });
                this.tree.$dom.find('.x-tree-search').focus();
            }
            if (this.opt.position === 'fixed') {
                this.tree.$dom.css({
                    top: this.dom.offset().top + this.dom.outerHeight(),
                    left: this.dom.offset().left,
                    minWidth: 200
                });
            }
        },
        _hideTree: function () {
            this.tree.$dom.hide();
        },

        _showChildren: function (item) {
            item.expand = true;
            item.$dom.$children.show();
            this._updateExpand(item);
        },
        _hideChildren: function (item) {
            item.expand = false;
            item.$dom.$children.hide();
            this._updateExpand(item);
        },

        _updateExpand: function (item) {
            if (item.expand) {
                item.$dom.$self.find('.x-tree-expand').removeClass('icon-xiangyou2');
                item.$dom.$self.find('.x-tree-expand').addClass('icon-xiangxia1');
            } else {
                item.$dom.$self.find('.x-tree-expand').removeClass('icon-xiangxia1');
                item.$dom.$self.find('.x-tree-expand').addClass('icon-xiangyou2');
            }
        },
        _updateCheck: function (item) {
            if (item.checkState === true) {
                item.$dom.$self.find('.x-tree-check').removeClass('icon-square icon-square-minus');
                item.$dom.$self.find('.x-tree-check').addClass('icon-square-check');
            } else if (item.checkState === false) {
                item.$dom.$self.find('.x-tree-check').removeClass('icon-square-check icon-square-minus');
                item.$dom.$self.find('.x-tree-check').addClass('icon-square');
            } else if (item.checkState === 'z') {
                item.$dom.$self.find('.x-tree-check').removeClass('icon-square icon-square-check');
                item.$dom.$self.find('.x-tree-check').addClass('icon-square-minus');
            }
        },
    };

})(jQuery);