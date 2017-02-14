/**
 * Created by Jesse on 2017/2/4.
 */
;(function ($) {

    window.treeTree = function (opt) {
        return new tree(opt);
    };

    var tree = function (opt) {
        this._init(opt);
        return this;
    };

    tree.prototype = {
        _defOpt: {
            dom: '',  //jqueryDom
            is_trigger: false,  //是否需要触发? 否则直接显示
            has_search: false,
            only_child: true,//是否结果只要 child
            node_merge: true,//结果只显示最上层  比如   中国被选中  四川,成都则不会显示  否则 每个被勾选的节点都显示
            zIndex: 1,
            choose: false,  //哪些是选中的？优先级高于data  {nodeId:[1,2,3],id:[1,2,3]}
            // node_first:false,//是否需要节点排在前面  否则按照data的顺序
            is_multi: true,//是否多选
            expand: false, //是否展开，false、true、num  //todo expand
            width: null,
            maxHeight: 300,
            data: [],//{id:1,name:'xx',nodeId:'0',is_node:true,is_check:false},
            sel_ids: '',
            onOpen: function () {
            }, //触发时
            onBeforeOpen: function () {
            },
            onClose: function (has_chg) {
                //has_chg  是否发生变化
            },
            onCheck: function (item, dom, childrenItem) {
                //item 点击的item
                //dom 点击的dom
                //childrenItem  所有影响的子节点
            },
            onCancel: function (item, dom, childrenItem) {
            },
            onChange: function (item, dom, childrenItem) {
            }
        },

        _state: {
            _isFirst: true,  //是不是第一次打开
            _isOpen: false,  //是否open
            _searchTimer: '',   //搜索框的定时器
            _originId: {nodeId: [], id: []}  //上次打开时候选中了哪一些id
        },

        _init: function (opt) {
            this.opt = $.extend(true, {}, this._defOpt, opt);
            this.state = $.extend(true, {}, this._state);

            this.tree = this._arrayToTree(this.opt.data);
            console.log(this.tree);

            this._checkTreeByIds(this.tree, this.opt.sel_ids);
            console.log(this.tree);


            this.dom = this.opt.dom;
            this.dom.css({'position': 'relative'});
            this.html = this._makePanel();

            var that = this;

            if (this.opt.is_trigger) {
                this.dom.off('click.xTree');
                this.dom.on('click.xTree', function (e) {
                    $('.xTreePanel').hide();
                    that.start();
                    e.stopPropagation();
                });
                $(document).on('click.xTree', function () {
                    that.end();
                });
            } else {
                this.start();
            }
        },

        //方法
        start: function () {
            this.opt.onBeforeOpen();
            this._showPanel();
            this._showData();
            this._expand();
            this.state._is_open = true;

            this.html.find('.x-tree-search').focus();
            this.opt.onOpen();
            return this;
        },
        end: function () {
            if (this.state._is_open) {
                this.html.hide();
                var ids = this.getId();

                this.state._is_open = false;
                this.opt.onClose(JSON.stringify(ids) !== JSON.stringify(this.state._originId));
                this.state._originId = ids;
            }
        },

        getName: function () {
            var text = [];
            var data = this.tree;
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

        getCheckedItems: function () {
            var items = [];
            if (this.opt.only_child) {
                this._traverseTree(this.tree, this._getCheckedItemsFnOnlyChild, undefined, items);
            } else if (this.opt.node_merge) {
                this._traverseTree(this.tree, this._getCheckedItemsFnNodeMerge, undefined, items);
            } else {
                this._traverseTree(this.tree, this._getCheckedNameFn, undefined, items);
            }
            return items;
        },

        _getCheckedItemsFnOnlyChild: function (item, input, items) {
            if (item.is_check && !item.is_node) {
                items.push(item);
            }
        },
        _getCheckedItemsFnNodeMerge: function (item, input, items) {
            if (item.is_check && !item.is_node) {
                items.push(item);
            }
        },
        _getCheckedNameFn: function (item, input, names) {
            if (this.opt.only_child) {
                $.each(data, function (i, n) {
                    if (n.is_check && !n.is_node) {
                        names.push(n.name);
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
                            names.push(n.name);
                        }
                    });
                } else {
                    $.each(data, function (i, n) {
                        if (n.is_check) {
                            names.push(n.name);
                        }
                    });
                }
            }
        },
        getId: function () {
            var id = [];
            var nodeId = [];
            var data = this.tree;

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
        cancelItem: function (id, type) {
            var item = {};
            var dom = this.html.find('input[data-isNode="' + parseInt(type) + '"][data-id="' + id + '"]').prop('checked', false);
            $.each(this.tree, function (i, n) {
                if (n.id == id && n.is_node == type) {
                    item = n;
                    item.is_check = false;
                }
            });

            this._chgItem(item, dom);

        },
        cancelAll: function () {
            $.each(this.tree, function (index, item) {
                item.is_check = false;
            });
            this.html.find('input').prop("checked", false);
            this.opt.onCancel();
        },
        checkItem: function (id, type) {
            var item = {};
            var dom = this.html.find('input[data-isNode="' + parseInt(type) + '"][data-i="' + id + '"]').prop('checked', true);
            $.each(this.tree, function (i, n) {
                if (n.id == id && n.is_node == type) {
                    item = n;
                    item.is_check = true;
                }
            });

            this._chgItem(item, dom);

        },
        checkAll: function () {
            if (this.opt.is_multi) {
                $.each(this.tree, function (index, item) {
                    item.is_check = true;
                });
                this.html.find('input').prop("checked", true);
                this.opt.onCheck();
            }
        },
        getItem: function () {
            var arr = [];
            var data = this.tree;
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
        search: function (val) {
            this._hideChildren(this.rootId);

            if (val === '') {
                this.html.find('div[node-id="' + this.rootId + '"]').remove();
                this._showChildren(this.rootId);
            } else {
                for (var i in this.tree) {
                    if (!this.tree[i].is_node && this.tree[i].name.indexOf(val) != -1) {
                        this.html.find('div[node-id="' + this.rootId + '"]').append(this._makeItem(this.tree[i]));
                    }
                }
            }
        },


        // 数据方法
        _arrayToTree: function (arrayIn) {
            var rootId = this._getTreeRoot(arrayIn);
            var treeData = {
                amount: arrayIn.length,
                id: rootId,
                dom: this.dom,
                name: 'root',
                parent: null,
                children: [],
                expand: true,
                level: 0
            };
            treeData.children = this._getSubTree(arrayIn, treeData);
            return treeData;
        },

        _getTreeRoot: function (arrayIn) {
            var rootId = [];
            var clone = $.extend(true, [], arrayIn);
            for (var i = 0, len = arrayIn.length; i < len; i++) {
                for (var j = i; j < len; j++) {
                    if (arrayIn[i].id === arrayIn[j].nodeId) {
                        // arrayIn[i].is_node = true;
                        clone[j] = null;
                    }
                    if (arrayIn[i].nodeId === arrayIn[j].id) {
                        // arrayIn[j].is_node = true;
                        clone[i] = null;
                    }
                }
            }
            $.each(clone, function (i, t) {
                if (t) {
                    rootId.push(t.nodeId);
                }
            });

            // 去除数组重复值
            // 方法一
            // function unique(array) {
            //     var n = [];
            //     for (var i = 0; i < array.length; i++) {
            //         if (n.indexOf(array[i]) == -1) n.push(array[i]);
            //     }
            //     return n;
            // }

            // 方法二
            function unique(array) {
                var r = [];
                for (var i = 0, len = array.length; i < len; i++) {
                    for (var j = i + 1; j < len; j++) {
                        if (array[i] === array[j]) {
                            j = ++i;
                        }
                    }
                    r.push(array[i]);
                }
                return r;
            }

            rootId = unique(rootId);
            // if (rootId.length != 1) {
            //     console.log('warning: rootId不存在或不唯一', rootId);
            // }

            if (rootId.length > 1) {
                console.log('warning: rootId不唯一', rootId);
            } else {
                if (rootId.length <= 0) {
                    console.log('warning: 没有rootId', rootId);
                }
            }

            return rootId[0];
        },

        _getSubTree: function (arrayIn, parent) {
            var result = [];
            var temp = {};
            for (var i = 0; i < arrayIn.length; i++) {
                if (arrayIn[i].nodeId === parent.id) {
                    temp = {
                        id: arrayIn[i].id,
                        name: arrayIn[i].name,
                        nodeId: arrayIn[i].nodeId,
                        is_node: arrayIn[i].is_node,
                        is_check: arrayIn[i].is_check
                    }; //copy
                    temp.parent = parent;
                    temp.level = parent.level + 1;
                    if (arrayIn[i].is_node) {
                        temp.expand = false;
                        temp.children = this._getSubTree(arrayIn, temp);
                    }
                    result.push(temp);
                }
            }
            return result;
        },

        // _getTreeDepth: function (tree, level) {
        //     var maxDepth = level;
        //     if (tree.children) {
        //         for (var i = 0; i < tree.children.length; i++) {
        //             this._getTreeDepth(tree.children[i], maxDepth);
        //         }
        //     }
        //     return maxDepth;
        // },
        // _getTreeLeaves: function (tree) {
        //     var leaves = [];
        //     for (var i = 0; i < tree.children.length; i++) {
        //         if(tree.is_node){
        //             leaves = this._getTreeLeaves(tree.children[i]);
        //         }else{
        //             leaves.push(tree);
        //         }
        //     }
        //     return leaves;
        // },


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
            if (!item) {
                return false;
            }
            item.is_check = change;
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
                return {
                    children: false,
                    brother: false
                };
            }
            var _continue = fn.call(this, tree, input, output);//是否继续遍历
            if (_continue.children && tree.children) {
                for (var i = 0; i < tree.children.length; i++) {
                    var brother = this._traverseTree(tree.children[i], fn, input, output);
                    if (brother) {
                        break;
                    }
                }
            }
            return _continue.brother;
        },


        //html方法,构造
        _makePanel: function () {
            var html = '<div class="xTreePanel"></div>';

            if (this.opt.has_search) {
                $(html).append(this._makeSearch());
            }

            var css;
            if (this.opt.is_trigger) {
                css = {
                    'font-family': 'Microsoft YaHei',
                    'z-index': this.opt.zIndex,
                    border: '1px solid #5d5d5d',
                    'background': '#fff',
                    position: 'absolute',
                    maxHeight: this.opt.maxHeight,
                    'white-space': 'nowrap',
                    'overflow': 'auto'
                };
            } else {
                css = {
                    'font-family': 'Microsoft YaHei',
                    'background': '#fff',
                    maxHeight: this.opt.maxHeight,
                    'white-space': 'nowrap',
                    'overflow': 'auto'
                };
            }

            return $(html).css(css);
        },

        _makeSearch: function () {
            var search = '<input class="x-tree-search" type="text" placeholder="搜索"/></div>';
            search = $(search).css({
                'border': 'none',
                'padding': '4px 0',
                'margin': '5px auto 0 auto',
                'display': 'block'
            });

            var obj = this;
            $(search).on('keyup paste', function () {
                var dom = this;
                clearTimeout(obj._searchTimer);
                obj._searchTimer = setTimeout(function () {
                    obj.search(dom.value);
                }, 100);
            });

            return search;

        },



        _makeTree: function (tree) {
            if (!tree) {
                return false;
            }

            tree.dom = this._makeItem(tree);

            this._bindEvent(tree);

            if (tree.children) {
                tree.childrenDom = this._makeLayer();
                for (var i = 0; i < tree.children.length; i++) {
                    var $item = this._makeTree(tree.children[i]);
                    tree.childrenDom.append($item);
                }
            }
            return tree.dom;
        },

        _makeItem: function (item) {

            var $item = this._makeItemWrap();

            var $expand = this._makeExpand(item.is_node);

            var $checkbox = this._makeCheckbox();

            var $text = this._makeText(item);

            var $children = this._makeChildrenWrap();


            $item.append($expand);
            $item.append($checkbox);
            $item.append($text);
            $item.append($children);

            return $item;
        },

        _makeItemWrap: function () {
            var html = '<div></div>';

            return $(html);
        },
        _makeExpand: function () {
            var html = '<i class="iconfont icon-expand"></i>';

            return $(html).css({
                'font-size': '12px',
                'vertical-align': 'base-line',
                'padding-right': '0px',
                'cursor': 'pointer'
            })[0].outerHTML;
        },
        _makeCheckbox: function () {
            var $html = $('<i class="iconfont icon-unchecked"></i>');
            $html.css({
                'vertical-align': 'middle'
            });
            return $html;
        },
        _makeText: function (item) {
            var $html;
            $html = $('<span>' + item.name + '</span>');

            $html.find('span').css({
                'width': '16px',
                'user-select': 'none',
                '-webkit-user-select': 'none',
                '-moz-user-select': 'none',
                '-ms-user-select': 'none',
                'display': 'inline-block'
            });

            return $html;
        },
        _makeChildrenWrap: function () {
            var html = '<div></div>';

            return $(html).css({
                'margin-left': '13px'
            });
        },

        _bindEvent: function (item) {
            var $item = item.dom;
            var obj = this;
            $item.find('input').on('click', function () {
                if (obj.opt.is_multi) {
                    item.is_check = !item.is_check;
                } else {
                    $.each(obj.data, function (index, item) {
                        item.is_check = false;
                    });
                    item.is_check = true;
                }


                obj._chgItem(item, $(this));

            });
        },





        //html方法,更改

        _changeItemDom:function (item) {
            this._changeExpand(item);
            this._changeCheckbox(item);
            this._changeText(item);
        },

        _changeExpand:function (item) {
            if(item.expand){
                item.dom.removeClass('icon-expand');
                item.dom.addClass('icon-shrink');
            }else{
                item.dom.removeClass('icon-shrink');
                item.dom.addClass('icon-expand');
            }
        },
        _changeCheckbox:function (item) {
            if(item.is_check){
                item.dom.removeClass('icon-unchecked');
                item.dom.addClass('icon-checked');
            }else{
                item.dom.removeClass('icon-checked');
                item.dom.addClass('icon-unchecked');
            }
        },
        _changeText: function (item) {
            item.dom = item.name;
        },





        _makeNode: function (item) {
            var $html;
            if (this.opt.is_multi) {
                $html = $('<div node-id="' + item.id + '">' + makeExpand() + '<label><input type="checkbox" data-isNode="1" data-id="' + item.id + '" ' + (item.is_check ? 'checked' : '') + ' data-name="' + item.name + '"/><span>' + item.name + '</span></label></div>');
            }
            else {
                if (this.opt.only_child) {
                    $html = $('<div node-id="' + item.id + '">' + makeExpand() + '<span>' + item.name + '</span></div>');
                }
                else {
                    $html = $('<div node-id="' + item.id + '">' + makeExpand() + '<label><input type="radio" name="' + this.dom.selector + '" data-isNode="1" data-id="' + item.id + '" ' + (item.is_check ? 'checked' : '') + ' data-name="' + item.name + '"/><span>' + item.name + '</span></label></div>');
                }
            }
            $html.find('span').css({
                'cursor': 'pointer',
                'user-select': 'none',
                '-webkit-user-select': 'none',
                '-moz-user-select': 'none',
                '-ms-user-select': 'none'
            });
            $html.find('input').css({
                'vertical-align': 'middle'
            });
            var obj = this;
            $html.find('i').on('click', function (e) {
                if ($(this).hasClass('icon-jia1')) {
                    obj._showChildren(item.id);
                } else {
                    obj._hideChildren(item.id);
                }
            });
            return $html;
        },


        //html方法,显示
        _showPanel: function () {
            if (this.opt.is_trigger) {
                this.html.css({
                    top: this.dom.outerHeight(),
                    left: 0,
                    minWidth: this.opt.width ? this.opt.width : this.dom.outerWidth()
                });


                this.html.on('click', function (e) {
                    e.stopPropagation();
                });
            }
            this.dom.append(this.html);

        },

        _showTree: function () {
            if (this._is_first) {
                this._showChildren(this.rootId);
                this._is_first = false;
            } else {
                this.html.show();
            }
        },
        
        _expand: function () {
            var obj = this;
            if (obj.opt.expand === true) {
                $.each(obj.data, function (index, item) {
                    if (item.is_node) {
                        obj.html.find('i').filter('.icon-jia1').click();
                    }
                });
            } else if (obj.opt.expand) {
                var expandId = [];
                expandId.push(obj.rootId);
                for (var i = 0; i < obj.opt.expand; i++) {
                    expandId = obj._expandLevel(expandId);
                }
            }
        },

        _expandLevel: function (id) {
            var obj = this;
            var expandId = [];
            $.each(id, function (index, item) {
                $.each(obj.data, function (index2, item2) {
                    if (item.is_node && item2.nodeId === item) {
                        expandId.push(item2.id);
                        obj.html.find('div[node-id="' + item2.nodeId + '"] > i').filter('.icon-jia1').click();
                    }
                });
            });
            return expandId;
        },

        _showChildren: function (item) {
            var showData = this._getLayerData(layerId);
            var itemDiv = makeLayer();


            //这里 0节点的结构 和 子节点的结构 没有处理好    以后尽量让node-id 和  itemdiv 分开
            if (layerId === this.rootId) {
                itemDiv = $(itemDiv).attr('node-id', this.rootId);
                this.html.append(itemDiv);
                //itemDiv.parent().attr('node-id',0);

            } else {
                toShrink(this.html.find('div[node-id="' + layerId + '"] i'));
                this.html.find('div[node-id="' + layerId + '"]').append(itemDiv);
            }

            for (var i in showData) {
                itemDiv.append(this._makeItem(showData[i]));
            }
        },

        _hideChildren: function (item) {
            this.html.find('div[node-id="' + layerId + '"]>div').remove();
            this._toExpand(this.html.find('div[node-id="' + layerId + '"] i'));
        }
    }


})(jQuery);

