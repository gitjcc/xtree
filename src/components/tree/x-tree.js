
;(function ($) {

    window.xTree = function (options) {
        return new tree(options);
    };

    var defOpt = {
        dom: '',  //jqueryDom
        is_trigger: false,  //是否需要触发? 否则直接显示
        has_search: false,
        searchType: 1, //1全部，2节点，3叶子
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


    var tree = function (opt) {
        this._init(opt);
        return this;
    };


    tree.prototype = {
        _is_open: false,  //是否open
        _originId: {nodeId: [], id: []},   //上次打开时候选中了哪一些id
        _searchTimer: '',   //搜索框的定时器
        _is_first: true,  //是不是第一次打开
        _init: function (opt) {
            var res = this._checkData(opt.data);
            if (!res) {
                return false;
            }

            this.opt = $.extend(true, {}, defOpt, opt);

            this.dom = this.opt.dom;
            this.dom.css({'position': 'relative'});


            this.data = this.opt.data;
            if (this.opt.sel_ids) {
                if (this.opt.is_multi) {
                    this._selData(this.data, this.opt);
                } else {
                    this._selDataRadio(this.data, this.opt);
                }
            }
            this.tree = this._arrayToTree(this.data);

            this.$root = this._makeTree(this.tree);
            this.dom.append(this.$root);


            this.opt.onInit.apply(this);

            var that = this;
            if (this.opt.is_trigger) {
                this.dom.off('click.xTree');
                this.dom.on('click.xTree', function (e) {
                    $('.xTreeWrap').hide();
                    that.show();
                    e.stopPropagation();
                });
                $(document).on('click.xTree', function () {
                    that.hide();
                });
            } else {
                this.show();
            }
        },

        /**
         *      方法
         *
         */
        show: function () {
            this.opt.onBeforeOpen.apply(this);

            this._showTreeWrap();
            this._showTree();

            this._is_open = true;

            this.$root.find('.x-tree-search').focus();

            this.opt.onOpen.apply(this);
            return this;
        },
        hide: function () {
            if (this._is_open) {
                this.$root.hide();

                this.opt.onClose.apply(this);

                this._originId = this.getId();

                this._is_open = false;
            }
        },

        getName: function (only, merge) {
            var text = [];
            var data = this.data;
            if (this.opt.only_child) {
                $.each(data, function (i, n) {
                    if (n.is_check && !n.is_node) {
                        text.push(n.name);
                    }
                });
            } else {
                if (this.opt.node_merge) {
                    var nodes = [];
                    $.each(data, function (i, n) {
                        if (n.is_check && n.is_node) {
                            nodes.push(n.id);
                        }
                    });

                    var clone = $.extend(true, [], data); //直接赋值传的是引用
                    $.each(clone, function (i, n) {
                        if ((n.is_check && $.inArray(n.nodeId, nodes) != -1) || !n.is_check) {
                            clone[i] = null;
                        }
                    });

                    $.each(clone, function (i, n) {
                        if (n) {
                            text.push(n.name);
                        }
                    });
                } else {
                    $.each(data, function (i, n) {
                        if (n.is_check) {
                            text.push(n.name);
                        }
                    });
                }
            }

            return text.join();
        },

        getId: function (only, merge) {
            var ids = [];
            var data = this.data;
            if (this.opt.only_child) {
                for (var i = 0; i < data.length; i++) {
                    if (data[i].is_check && !data[i].is_node) {
                        ids.push(data[i].id);
                    }
                }
            } else {
                for (var j = 0; j < data.length; j++) {
                    if (data[j].is_check) {
                        ids.push(data[j].id);
                    }
                }
            }
            return ids;
        },

        getIdss: function (only, merge) {
            var id = [];
            var nodeId = [];
            var data = this.data;

            if (this.opt.only_child) {
                $.each(data, function (i, n) {
                    if (n.is_check && !n.is_node) {
                        id.push(n.id);
                    }
                });
            } else {
                if (this.opt.node_merge) {
                    var node = [];
                    $.each(data, function (i, n) {
                        if (n.is_check && n.is_node) {
                            node.push(n.id);
//                            text.push( n.name);  //nodefirst
                        }
                    });
                    var clone = $.extend(true, [], data);
                    $.each(clone, function (i, n) {
                        if ((n.is_check && $.inArray(n.nodeId, node) != -1) || !n.is_check) {
                            clone[i] = null;
                        }
                    });
                    $.each(clone, function (i, n) {
                        if (n) {
                            if (n.is_node) {
                                nodeId.push(n.id);
                            } else {
                                id.push(n.id);
                            }
                        }
                    });
                } else {
                    $.each(data, function (i, n) {
                        if (n.is_check) {
                            if (n.is_node) {
                                nodeId.push(n.id);
                            } else {
                                id.push(n.id);
                            }
                        }
                    });
                }
                id = {'id': id, 'nodeId': nodeId};
            }
            return id;
        },

        cancelItem: function (ids, isNode) {
            if (!Array.isArray(ids)) {
                return "checkItem(),参数ids不是数组";
            }
            isNode = !!isNode;
            var item = {};
            var dom;
            for (var i = 0; i < ids.length; i++) {
                for (var j = 0; j < this.data.length; j++) {
                    if (this.data[j].id == ids[i] && this.data[j].is_node == isNode) {
                        item = this.data[j];
                        item.is_check = false;
                        dom = this.$root.find('input[data-isNode=' + isNode + '][data-id="' + ids[i] + '"]').prop('checked', false);
                        this._changeItem(item, dom);
                    }
                }
            }
        },
        checkItem: function (ids, isNode) {
            if (!Array.isArray(ids)) {
                return "checkItem(),参数ids不是数组";
            }
            isNode = !!isNode;
            this._changeItems(ids);

            var item = {};
            var dom;
            for (var i = 0; i < ids.length; i++) {
                for (var j = 0; j < this.data.length; j++) {
                    if (this.data[j].id == ids[i] && this.data[j].is_node == isNode) {
                        item = this.data[j];
                        item.is_check = true;
                        dom = this.$root.find('input[data-isNode=' + isNode + '][data-id="' + ids[i] + '"]').prop('checked', true);
                        this._changeItem(item, dom);
                    }
                }
            }
        },

        cancelAll: function () {
            $.each(this.data, function (index, item) {
                item.is_check = false;
            });
            this.$root.find('input').prop("checked", false);
            this.opt.onCancel.apply(this);
        },
        checkAll: function () {
            if (this.opt.is_multi) {
                $.each(this.data, function (index, item) {
                    item.is_check = true;
                });
                this.$root.find('input').prop("checked", true);
                this.opt.onCheck.apply(this);
            }
        },

        search: function (val) {
            this._hideChildren(this.tree);

            if (val === '') {
                this.$root.find('div[node-id="' + this.tree.id + '"]').remove();
                this._showChildren(this.tree);
            } else {
                for (var i in this.data) {
                    if (this.opt.searchType == 1) {
                        if (this.data[i].name.indexOf(val) != -1) {
                            this.$root.find('div[node-id="' + this.tree.id + '"]').append(this._makeItem(this.data[i]));
                        }
                    } else if (this.opt.searchType == 2) {
                        if (this.data[i].is_node && this.data[i].name.indexOf(val) != -1) {
                            this.$root.find('div[node-id="' + this.tree.id + '"]').append(this._makeItem(this.data[i]));
                        }
                    } else if (this.opt.searchType == 3) {
                        if (!this.data[i].is_node && this.data[i].name.indexOf(val) != -1) {
                            this.$root.find('div[node-id="' + this.tree.id + '"]').append(this._makeItem(this.data[i]));
                        }
                    }
                }
            }
        },


        /**
         *      数据方法
         */

        _checkData: function (data) {
            for (var i in data) {
                if (typeof data[i] !== 'object') {
                    return false;
                }
            }
            return true;
        },

        _selData: function (data, opt) {
            var sel_ids = opt.sel_ids.split(',');
            for (var i = 0; i < sel_ids.length; i++) {
                for (var j = 0; j < data.length; j++) {
                    if (opt.only_child) {
                        if (!data[j].is_node && data[j].id == sel_ids[i]) {
                            data[j].is_check = true;
                            this._selParent(data, data[j].nodeId);
                        }
                    } else {
                        if (data[j].id == sel_ids[i]) {
                            data[j].is_check = true;
                            this._selParent(data, data[j].nodeId);
                            if (data[j].is_node && data[i].has_children) {
                                this._selChildren(data, data[j].id);
                            }
                        }
                    }
                }
            }
            return data;
        },

        _selDataRadio: function (data, opt) {
            var sel_ids = opt.sel_ids;
            for (var j = 0; j < data.length; j++) {
                if (data[j].id == sel_ids) {
                    data[j].is_check = true;
                }
            }
            return data;
        },

        _selParent: function (data, nid) {
            if (!nid) {
                return false;
            }
            var selParent = true;
            var sel_p = {};
            for (var i = 0; i < data.length; i++) {
                if (data[i].id == nid && data[i].is_node) {
                    sel_p = data[i];
                }
            }

            for (var j = 0; j < data.length; j++) {
                if (data[j].nodeId == nid && !data[j].is_check) {
                    selParent = false;
                    return false;
                }
            }

            if (selParent) {
                sel_p.is_check = true;
                if (sel_p.nodeId) {
                    this._selParent(data, sel_p.nodeId);
                }
            }
        },

        _selChildren: function (data, id) {
            if (!id) {
                return false;
            }
            for (var i = 0; i < data.length; i++) {
                if (data[i].nodeId == id) {
                    data[i].is_check = true;
                    if (data[i].is_node && data[i].has_children) {
                        this._selChildren(data, data[i].id);
                    }
                }

            }
        },

        _changeAll: function () {

        },

        _getItem: function () {
            var arr = [];
            var data = this.data;
            if (this.opt.only_child) {
                $.each(data, function (i, n) {
                    if (n.is_check && !n.is_node) {
                        arr.push(n);
                    }
                });
            } else {

                if (this.opt.node_merge) {
                    var node = [];
                    $.each(data, function (i, n) {
                        if (n.is_check && n.is_node) {
                            node.push(n.id);
//                            text.push( n.name);  //nodefirst
                        }
                    });

                    var clone = $.extend(true, [], data);
                    $.each(clone, function (i, n) {
                        if ((n.is_check && $.inArray(n.nodeId, node) != -1) || !n.is_check) {
                            clone[i] = null;
                        }
                    });


                    $.each(clone, function (i, n) {
                        if (n) {
                            arr.push(n);
                        }
                    });
                } else {
                    $.each(data, function (i, n) {
                        if (n.is_check) {
                            arr.push(n);
                        }
                    });
                }


            }
            return arr;
        },

        _getChild: function (node, cont) {
            if (node.is_node && node.has_children) {
                var that = this;
                $.each(that.data, function (i, n) {
                    if (n.nodeId == node.id) {
                        cont.push(n);
                        if (n.is_node && node.has_children) {
                            that._getChild(n, cont);
                        }
                    }
                })
            }
        },

        _cancelParentNode: function (id) {
            var that = this;
            $.each(that.data, function (i, n) {
                if (n.id == id && n.is_node && n.is_check) {
                    n.is_check = false;
                    that.$root.find('input[data-isNode=true][data-id="' + id + '"]').prop('checked', false);
                    that._cancelParentNode(n.nodeId);
                }
            })
        },

        _checkParentNode: function (id) {
            var that = this;
            var allChildrenChecked = true;
            $.each(that.data, function (i, n) {
                if (n.nodeId == id && !n.is_check) {
                    allChildrenChecked = false;
                }
            });
            $.each(that.data, function (i, n) {
                if (n.id == id && n.is_node && !n.is_check && allChildrenChecked) {
                    n.is_check = true;
                    that.$root.find('input[data-isNode=true][data-id="' + id + '"]').prop('checked', true);
                    that._checkParentNode(n.nodeId);
                }
            });
        },

        _chgAllChildren: function (nodeid, bol) {
            var that = this;
            $.each($.extend(true, [], this.data), function (i, n) {   //这句话 看起来 好像 不用 extend
                if (n.nodeId == nodeid) {
                    that.data[i].is_check = bol;
                    if (n.is_node && n.has_children) {
                        that._chgAllChildren(n.id, bol);
                    }
                }
            });
        },


        /*数据方法*/
        _arrayToTree: function (arrayIn) {
            var rootId = this._getTreeRoot(arrayIn);
            var treeData = {
                id: rootId,
                name: 'ROOT',
                nodeId: null,
                is_node: true,
                is_check: false,
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
                    temp.parent = parent;
                    temp.level = parent.level + 1;

                    temp.expand = temp.is_check;
                    temp.checkState = temp.is_check;
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

        _getItemById: function (tree, id) {
            var item = {};
            if (tree.id == id) {
                return tree;
            } else {
                if (tree.children) {
                    for (var i = 0; i < tree.children.length; i++) {
                        item = this._getItemById(tree.children[i], id);
                        if (item) {
                            return item;
                        }
                    }
                }
            }
            return false;
        },

        _getItemsByIds: function (tree, ids) {
            var items = [];
            this._traverseTree(tree, this._getItemsByIdsFn, ids, items);
            return items;
        },
        _getItemsByIdsFn: function (item, ids, items) {
            if (!ids.length) {
                return false;
            }
            for (var i = 0; i < ids.length; i++) {
                if (item.id == ids[i]) {
                    items.push(item);
                    ids.splice(i, 1);
                    break;
                }
            }
            return ids.length;
        },

        _changeItem: function (item, change) {
            if (!item && item.is_check === change) {
                return false;
            }
            item.is_check = change;
            this._updateCheck(item);
            if (item.children) {
                this._changeChildren(item.children, change);
            }
            if (item.parent) {
                this._changeParent(item.parent, change);
            }
        },

        _changeChildren: function (children, change) {
            if (!children) {
                return false;
            }
            for (var i = 0; i < children.length; i++) {
                if (children[i].is_check != change) {
                    children[i].is_check = change;
                    this._updateCheck(children[i]);
                    if (children[i].children) {
                        this._changeChildren(children[i], change);
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
            this._updateCheck(parent);
            if (parent.parent) {
                this._changeParent(parent.parent, change);
            }
        },
        _checkTreeByIds: function (tree, sel_ids) {
            var ids = sel_ids.split(',');
            for (var i = 0; i < $.length; i++) {
                ids[i] = parseInt(ids[i]);
            }
            this._traverseTree(tree, this._checkTreeByIdsFn, ids);
        },
        _checkTreeByIdsFn: function (item, ids) {
            if (!ids.length) {
                return false;
            }
            for (var i = 0; i < ids.length; i++) {
                if (item.id == ids[i]) {
                    this._changeItem(item, true);
                    ids.splice(i, 1);
                    break;
                }
            }
            return ids.length;
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
         * 构造html内部方法
         */

        _makeTree: function (tree) {
            tree.$dom = this._makeTreeWrap(tree);
            tree.$dom.$self = this._makeSelfWrap(tree);
            tree.$dom.$children = this._makeChildrenWrap(tree);
            tree.$dom.append(tree.$dom.$self,tree.$dom.$children);
            tree.$dom.$self.hide();
            if (tree.is_node && tree.children && tree.children.length) {
                for (var i = 0; i < tree.children.length; i++) {
                    tree.$dom.$children.append(this._makeTreeFn(tree.children[i]));
                }
            }
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
        _makeTreeWrap: function () {
            var $html = $('<div class="x-tree-root"></div>');
            $html.hide();

            if (this.opt.has_search) {
                $html.append(this._makeSearch());
            }

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

                $html.addClass('xTreeWrap');

                $html.on('click', function (e) {
                    e.stopPropagation();
                });
            }

            return $html;
        },
        _makeSearch: function () {
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
                var dom = this;
                clearTimeout(that._searchTimer);
                that._searchTimer = setTimeout(function () {
                    that.search(dom.value);
                }, 100);
            });

            return $search;

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

            $item.append($self,$children);

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
            }else{
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
                'display':'none',
                'margin-left': '16px'
            });
            return $html;
        },

        _makeExpand: function (item) {
            var $expand;
            if (item.is_node && item.children && item.children.length) {
                $expand = $('<i class="x-tree-expand fa fa-caret-right"></i>');
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
                if (that.opt.is_multi) {
                    that._changeItem(item, !item.is_check);
                } else {
                    $.each(that.data, function (index, item) {
                        item.is_check = false;
                    });
                    item.is_check = true;
                }
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

            var $text = $('<span></span>');

            $text.text(item.name);
            $text.css({
                padding: '0 0 0 5px'
            });

            return $text;
        },

        _showChildren: function (item) {
            console.log(item);
            item.expand = true;
            item.$dom.$children.show();
            this._updateExpand(item);
        },

        _hideChildren: function (item) {
            item.expand = false;

            item.$dom.$children.hide();
            this._updateExpand(item);
        },



        /**
         *      视图方法
         */

        _showTreeWrap: function () {
            this.$root.show();
        },
        _showTree: function () {
            if (this._is_first) {
                this._showChildren(this.tree);
                this._is_first = false;
            } else {
                this.$root.show();
            }
        },

        _expand: function () {
            var that = this;
            if (that.opt.expand === true) {
                $.each(that.data, function (index, item) {
                    if (item.is_node && item.has_children) {
                        that.$root.find('i').filter('.fa-caret-right').click();
                    }
                });
            } else if (that.opt.expand) {
                var expandId = [];
                expandId.push(that.tree.id);
                for (var i = 0; i < that.opt.expand + 1; i++) {
                    expandId = that._expandLevel(expandId);
                }
            }
        },
        _expandLevel: function (id) {
            var that = this;
            var expandId = [];
            $.each(id, function (index, item) {
                that.$root.find('div[node-id="' + item + '"] > i').filter('.fa-caret-right').click();
                $.each(that.data, function (index2, item2) {
                    if (item2.nodeId == item && item2.is_node) {
                        expandId.push(item2.id);
                    }
                });
            });
            return expandId;
        },

        _updateExpand:function (item) {
            if(item.expand){
                item.$dom.$self.find('.x-tree-expand').removeClass('fa-caret-right');
                item.$dom.$self.find('.x-tree-expand').addClass('fa-caret-down');
            }else{
                item.$dom.$self.find('.x-tree-expand').removeClass('fa-caret-down');
                item.$dom.$self.find('.x-tree-expand').addClass('fa-caret-right');
            }
        },
        _updateCheck: function (item) {
            if (item.is_check === true) {
                item.$dom.$self.find('.x-tree-check').removeClass('fa-square-o');
                item.$dom.$self.find('.x-tree-check').addClass('fa-check-square-o');
            } else if (item.is_check === false) {
                item.$dom.$self.find('.x-tree-check').removeClass('fa-check-square-o');
                item.$dom.$self.find('.x-tree-check').addClass('fa-square-o');
            } else if (item.is_check === 3) {

            }

        },
    };

})(jQuery);

