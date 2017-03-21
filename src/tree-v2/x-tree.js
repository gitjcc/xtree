;(function ($) {

    window.xTree = function (options) {
        return new tree(options);
    };

    var defOpt = {
        dom: '',  //jqueryDom
        is_trigger: false,  //是否需要触发? 否则直接显示
        has_search: false,
        searchType: 0, //0全部，1节点，2叶子
        only_child: false,//是否结果只要 child
        node_merge: false,//结果只显示最上层  比如   中国被选中  四川,成都则不会显示  否则 每个被勾选的节点都显示
        zIndex: 99,
        is_multi: true,//是否多选
        expand: false, //是否展开，false、true、num, (0、false,都展开ROOT级。true,完全展开。num>=1时，展开到对应级）
        width: null,
        maxHeight: 300,
        data: [],//{id:1,name:'xx',nodeId:'0',is_node:true,is_check:false},
        sel_ids: '',
        onInit: function () {
        },
        onBeforeOpen: function () {
        },
        onOpen: function () {
        },
        onCheck: function () {
        },
        onCancel: function () {
        },
        onChange: function () {
        },
        onClose: function () {
        },
    };
    var defState = {
        _is_open: false,  //是否open
        _originId: {nodeId: [], id: []},   //上次打开时候选中了哪一些id
        _searchTimer: ''   //搜索框的定时器
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

            this.dom = this.opt.dom;
            this.dom.css({'position': 'relative'});

            this.tree = this._arrayToTree(this.opt.data);

            this.dom.append(this._makeTree(this.tree));

            if (this.opt.sel_ids) {
                if (this.opt.is_multi) {
                    this._checkTreeByIds(this.tree, this.opt.sel_ids);
                } else {
                    this._checkDataRadio(this.opt.data, this.opt.sel_ids);
                }
            }

            this.opt.onInit.apply(this);

            var that = this;
            if (this.opt.is_trigger) {
                this.dom.off('click.xTree');
                this.dom.on('click.xTree', function (e) {
                    that.show();
                    e.stopPropagation();
                });
                $(document).on('click.xTree', function () {
                    that.hide();
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
            if (this.opt.is_trigger) {
                this.tree.$dom.find('.x-tree-search').focus();
            }
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

        getName: function (type) {
            var name = [];
            var items = this._getItems(type);
            for (var i = 0; i < items.length; i++) {
                name.push(items[i].name);
            }
            return name.join();
        },
        getId: function (type) {
            var ids = [];
            var items = this._getItems(type);
            for (var i = 0; i < items.length; i++) {
                ids.push(items[i].id);
            }
            return ids;
        },

        cancelItem: function (ids, type) {
            if (!Array.isArray(ids)) {
                return "checkItem(),参数ids不是数组";
            }
            var items = this._getItemsByIds(this.opt.data, ids, type);
            for (var i = 0; i < items.length; i++) {
                this._changeItem(items[i], false);
            }
        },
        checkItem: function (ids, type) {
            if (!Array.isArray(ids)) {
                return "checkItem(),参数ids不是数组";
            }
            var items = this._getItemsByIds(this.opt.data, ids, type);
            for (var i = 0; i < items.length; i++) {
                this._changeItem(items[i], true);
            }
        },
        cancelAll: function () {
            for (var i = 0; i < this.opt.data.length; i++) {
                this._changeItem(this.opt.data[i], false);
            }
        },
        checkAll: function () {
            for (var i = 0; i < this.opt.data.length; i++) {
                this._changeItem(this.opt.data[i], true);
            }
        },

        search: function (val) {
            this.tree.$dom.$children.hide();

            if (val === '') {
                this.tree.$dom.$search.empty();
                this.tree.$dom.$children.show();
            } else {
                this.tree.$dom.$search.empty();
                for (var i in this.opt.data) {
                    if (this.opt.searchType == 0) {
                        if (this.opt.data[i].name.indexOf(val) != -1) {
                            this.tree.$dom.$search.append(this._makeItem(this.opt.data[i]));
                        }
                    } else if (this.opt.searchType == 1) {
                        if (this.opt.data[i].is_node && this.opt.data[i].name.indexOf(val) != -1) {
                            this.tree.$dom.$search.append(this._makeItem(this.opt.data[i]));
                        }
                    } else if (this.opt.searchType == 2) {
                        if (!this.opt.data[i].is_node && this.opt.data[i].name.indexOf(val) != -1) {
                            this.tree.$dom.$search.append(this._makeItem(this.opt.data[i]));
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
            var data = this.opt.data;
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
        _getItems: function (type) {
            var items = [];
            var data = this.opt.data;
            if (!type || type === 0) {
                for (var k = 0; k < data.length; k++) {
                    if (data[k].is_check) {
                        items.push(data[k]);
                    }
                }

            } else if (type === 1) {
                for (var i = 0; i < data.length; i++) {
                    if (data[i].is_check && !data[i].is_node) {
                        items.push(data[i]);
                    }
                }
            } else if (type === 2) {
                this._getItemMerge(this.tree, items);
            }
            return items;
        },
        _getItemMerge: function (item, items) {
            if (item.is_check) {
                items.push(item);
                return false;
            }
            if (item.is_node && item.children && item.children.length) {
                for (var i = 0; i < item.children.length; i++) {
                    this._getItemMerge(item.children[i], items);
                }
                return false;
            }
            return true;
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
                    if (item.id == ids[i] && !data[i].is_node) {
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
            for (var i = 0; i < this.opt.data.length; i++) {
                this.opt.data[i].is_check = false;
                this.opt.data[i].checkState = false;
                this._updateCheck(this.opt.data[i]);
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
            var _continue = fn.call(this, tree, input, output);//是否继续遍历
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

            if (this.opt.is_trigger) {
                $html.css({
                    top: this.dom.outerHeight(),
                    left: 0,
                    minWidth: 200
                    // minWidth: this.opt.width ? this.opt.width : this.dom.outerWidth() * 0.98
                });

                $html.on('click', function (e) {
                    e.stopPropagation();
                });
            }
            return $html;
        },
        _makeSearchInput: function (item) {
            var $search = $('<input class="x-tree-search" type="text" placeholder="搜索"/></div>');
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
            $searchWrap.addClass('x-tree-search');
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
            $itemWrap.attr({'node-id': item.nodeId, 'data-id': item.id});
            if (item.is_node) {
                $itemWrap.addClass('x-tree-node-' + item.id);
            } else {
                $itemWrap.addClass('x-tree-leaf-' + item.id);
            }
            $itemWrap.css({cursor: 'pointer'});
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
                    $expand = $('<i class="x-tree-expand fa fa-caret-right"></i>');
                } else {
                    $expand = $('<i class="x-tree-expand fa fa-caret-down"></i>');
                }
                var that = this;
                $expand.on('click', function (e) {
                    if ($(this).hasClass('fa-caret-right')) {
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
                $check = $('<i class="x-tree-check fa fa-check-square-o" /i>');
            } else {
                $check = $('<i class="x-tree-check fa fa-square-o" /i>');
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
            var $folder = $('<i class="fa fa-folder-o"></i>');
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
                item.$dom.$self.find('.x-tree-expand').removeClass('fa-caret-right');
                item.$dom.$self.find('.x-tree-expand').addClass('fa-caret-down');
            } else {
                item.$dom.$self.find('.x-tree-expand').removeClass('fa-caret-down');
                item.$dom.$self.find('.x-tree-expand').addClass('fa-caret-right');
            }
        },
        _updateCheck: function (item) {
            if (item.checkState === true) {
                item.$dom.$self.find('.x-tree-check').removeClass('fa-square-o fa-minus-square-o');
                item.$dom.$self.find('.x-tree-check').addClass('fa-check-square-o');
            } else if (item.checkState === false) {
                item.$dom.$self.find('.x-tree-check').removeClass('fa-check-square-o fa-minus-square-o');
                item.$dom.$self.find('.x-tree-check').addClass('fa-square-o');
            } else if (item.checkState === 'z') {
                item.$dom.$self.find('.x-tree-check').removeClass('fa-square-o fa-check-square-o');
                item.$dom.$self.find('.x-tree-check').addClass('fa-minus-square-o');
            }

        },
    };

})(jQuery);
