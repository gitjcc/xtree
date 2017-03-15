/**
 * 命名大意：
 * dom              用户定义承载树的dom
 * html             树的html
 * item             data的每一条,可以是node也可以是child
 * child/leaf       树的叶子;子元素;成员
 * node             树的节点;文件夹;部门
 * layer/children   树的层级,包含同一层的item(node,child);
 * _fn()                带有下划线的是插件需要的方法属性，用户不需要使用
 *
 *
 *
 *
 * 思路:
 * 1.node的id和child的id可以重复,因为实际场景可能是两种数据比如,部门和人员.对于省份和城市可能本身就不会重复
 * 2.选择数据,用户需要的结果是:1.所有child.2.node+child
 * 3.is_trigger如果是true,是为input框设计的,会去读取input框的宽度作为自身的宽度
 * 4.这里html的input显示的时候根据data决定是否check，
 * 5.每次的点击input产生的变化是html变了，然后data也变。
 * 6.4，5导致容易出错,但我觉得应该是根据操作data数据发生变化，变化完毕，统一一个方法决定html结构的变化，不过效率不一定更高
 * 7.only_child为true必然不会node_merge
 * 8.代码中还有一些根据标签(div,span)来做的判断,都不太靠谱
 *
 *
 */

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


    /**
     *
     * @var opt  用户传进来的option
     * @var dom 打开tree的载体jquery dom
     * @var data  做tree的data
     * @var html tree的html
     */


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
            this.data = this._initData(this.opt.data);
            this.rootId = this._getRootId(this.data);
            if (this.opt.sel_ids) {
                if (this.opt.is_multi) {
                    this._selData(this.data, this.opt);
                } else {
                    this._selDataRadio(this.data, this.opt);
                }
            }

            this._originId = this.getId();

            this.dom = this.opt.dom;
            this.dom.css({'position': 'relative'});
            this.$html = this._makeRoot();

            this.opt.onInit.apply(this);

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

        /**
         *      方法
         *
         */
        start: function () {
            this.opt.onBeforeOpen.apply(this);

            this._showRoot();
            this._showData();
            this._expand();
            this._is_open = true;

            this.$html.find('.x-tree-search').focus();

            this.opt.onOpen.apply(this);
            return this;
        },
        end: function () {
            if (this._is_open) {
                this.$html.hide();

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
                        dom = this.$html.find('input[data-isNode=' + isNode + '][data-id="' + ids[i] + '"]').prop('checked', false);
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
                        dom = this.$html.find('input[data-isNode=' + isNode + '][data-id="' + ids[i] + '"]').prop('checked', true);
                        this._changeItem(item, dom);
                    }
                }
            }
        },

        cancelAll: function () {
            $.each(this.data, function (index, item) {
                item.is_check = false;
            });
            this.$html.find('input').prop("checked", false);
            this.opt.onCancel.apply(this);
        },
        checkAll: function () {
            if (this.opt.is_multi) {
                $.each(this.data, function (index, item) {
                    item.is_check = true;
                });
                this.$html.find('input').prop("checked", true);
                this.opt.onCheck.apply(this);
            }
        },

        search: function (val) {
            this._removeChildren(this.rootId);

            if (val === '') {
                this.$html.find('div[node-id="' + this.rootId + '"]').remove();
                this._showChildren(this.rootId);
            } else {
                for (var i in this.data) {
                    if (this.opt.searchType == 1) {
                        if (this.data[i].name.indexOf(val) != -1) {
                            this.$html.find('div[node-id="' + this.rootId + '"]').append(this._makeItem(this.data[i]));
                        }
                    } else if (this.opt.searchType == 2) {
                        if (this.data[i].is_node && this.data[i].name.indexOf(val) != -1) {
                            this.$html.find('div[node-id="' + this.rootId + '"]').append(this._makeItem(this.data[i]));
                        }
                    } else if (this.opt.searchType == 3) {
                        if (!this.data[i].is_node && this.data[i].name.indexOf(val) != -1) {
                            this.$html.find('div[node-id="' + this.rootId + '"]').append(this._makeItem(this.data[i]));
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
                return typeof data[i] === 'object';
            }
            return false;
        },

        _initData: function (data) {
            var clone = $.extend(true, [], data);
            var len = clone.length;

            for (var k = 0; k < len; k++) {
                clone[k].has_children = false;
            }

            for (var i = 0; i < len; i++) {
                for (var j = i; j < len; j++) {
                    if (clone[i].is_node && clone[i].id == clone[j].nodeId) {
                        clone[i].has_children = true;
                    }
                    if (clone[i].nodeId == clone[j].id && clone[j].is_node) {
                        clone[j].has_children = true;
                    }
                }
            }

            return clone;
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

        _getRootId: function (_data) {
            var rootId = [];
            var clone = $.extend(true, [], _data);
            for (var i = 0, len = _data.length; i < len; i++) {
                for (var j = i; j < len; j++) {
                    if (_data[i].id == _data[j].nodeId) {
                        clone[j] = null;
                    }
                    if (_data[i].nodeId == _data[j].id) {
                        clone[i] = null;
                    }
                }
            }
            $.each(clone, function (i, t) {
                if (t) {
                    rootId.push(t.nodeId);
                }
            });

            // //去除数组重复值
            // function unique(array){
            //     var n = [];
            //     for(var i = 0; i < array.length; i++){
            //         if (n.indexOf(array[i]) == -1) n.push(array[i]);
            //     }
            //     return n;
            // }
            //
            // function unique(array){
            //     var r = [];
            //     for(var i = 0, l = array.length; i < l; i++) {
            //         for(var j = i + 1; j < l; j++){
            //             if (array[i] == array[j]) {
            //                 j = ++i;
            //             }
            //         }
            //         r.push(array[i]);
            //     }
            //     return r;
            // }
            // rootId = unique(rootId);

            return rootId[0];
        },

        _getChildrenData: function (parent) {
            var res = [];
            for (var i in this.data) {
                if (this.data[i].nodeId == parent) {
//                if(data[i].is_node){
//                    res.unshift(data[i])
//                }else{
//                    res.push(data[i]);
//                }

                    res.push(this.data[i]);  //原序
                }
            }
            return res;
        },


        _changeItems: function () {

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

        _changeItem: function (item, dom) {

            if (this.opt.is_multi) {
                if (item.is_node) {
                    dom.parent().parent().find('label > input').prop('checked', item.is_check);
                    this._chgAllChildren(item.id, item.is_check);
                }

                if (!item.is_check) {
                    this._cancelParentNode(item.nodeId);
                } else {
                    this._checkParentNode(item.nodeId);
                }
            }


            var childItem = [];
            this._getChild(item, childItem);

            this.opt.onChange.apply(this);

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
                    that.$html.find('input[data-isNode=true][data-id="' + id + '"]').prop('checked', false);
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
                    that.$html.find('input[data-isNode=true][data-id="' + id + '"]').prop('checked', true);
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
                dom: this.dom,
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

        _uniqueArray:function (arrayIn) {
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
                    // temp = {
                    //     id: arrayIn[i].id,
                    //     name: arrayIn[i].name,
                    //     nodeId: arrayIn[i].nodeId,
                    //     is_node: arrayIn[i].is_node,
                    //     is_check: arrayIn[i].is_check
                    // }; //copy
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


        /**
         * 构造html内部方法
         */
        _makeRoot: function () {
            var html = '<div class="x-tree-root"></div>';

            if (this.opt.has_search) {
                html = this._makeSearch(html);
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


            return $(html).css(style);
        },
        _makeSearch: function (html) {
            var search = '<input class="x-tree-search" type="text" placeholder="搜索"/></div>';
            search = $(search).css({
                'border': 'none',
                'padding': '4px 0',
                'margin': '5px auto 0 auto',
                'width': '98%',
                'display': 'block'
            });

            var that = this;
            $(search).on('keyup paste', function () {
                var dom = this;
                clearTimeout(that._searchTimer);
                that._searchTimer = setTimeout(function () {
                    that.search(dom.value);
                }, 100);
            });

            return $(html).append(search);

        },
        _makeItem: function (item) {
            if (!item) {
                return false;
            }

            var $item = this._makeItemWrap(item);
            var $self = this._makeSelfWrap(item);

            var $expand = this._makeExpand(item);
            var $checkbox = this._makeCheckbox(item);
            var $folder = this._makeFolder(item);
            var $text = this._makeText(item);

            $self.append($expand, $checkbox, $folder, $text);

            $item.append($self);

            return $item;
        },
        _makeItemWrap: function (item) {
            var $html = $('<div class="x-tree-item" ></div>');
            $html.attr({'node-id': item.nodeId, 'data-id': item.id});
            if (item.is_node) {
                $html.addClass('x-tree-node-' + item.id);
            }
            $html.css({cursor: 'pointer'});
            return $html;
        },
        _makeSelfWrap: function (item) {
            var $html = $('<div></div>');
            $html.addClass('x-tree-self-' + item.id);
            return $html;
        },
        _makeExpand: function (item) {
            var $html;
            if (item.is_node && item.has_children) {
                $html = $('<i class="x-tree-expand fa fa-caret-right"></i>');
                var that = this;
                $html.on('click', function (e) {
                    if ($(this).hasClass('fa-caret-right')) {
                        that._showChildren(item.id);
                    } else {
                        that._removeChildren(item.id);
                    }
                });
            } else {
                $html = $('<span></span>');
            }
            $html.css({
                display: 'inline-block',
                'vertical-align': 'base-line',
                'padding-right': '0px',
                'cursor': 'pointer',
                width: '14px',
                height: '14px',
            });
            return $html;
        },
        _makeCheckbox: function (item) {
            if (!item) {
                console.log('_makeCheckbox失败,item不存在', item);
                return '';
            }

            var $html;
            // if(item.is_check){
            //     $html = $('<i class="x-tree-checkbox fa fa-square-o"></i>');
            // }else{
            //     $html = $('<i class="x-tree-checkbox fa fa-square-o"></i>');
            // }

            $html = $('<input type="checkbox" data-isNode=true data-id="' + item.id + '" ' + (item.is_check ? 'checked' : '') + ' data-name="' + item.name + '"/>');


            var that = this;
            $html.on('click', function () {
                if (that.opt.is_multi) {
                    item.is_check = !item.is_check;
                } else {
                    $.each(that.data, function (index, item) {
                        item.is_check = false;
                    });
                    item.is_check = true;
                }

                that._changeItem(item, $(this));

            });

            $html.css({
                'vertical-align': 'base-line',
                'padding-right': '0px',
                'cursor': 'pointer',
                'color': '#333',
                width: '14px',
                height: '14px',
            });

            return $html;
        },
        _makeFolder: function (item) {
            if (!item || !item.is_node) {
                return '';
            }

            var $html = $('<i class="fa fa-folder-o"></i>');

            $html.css({
                'vertical-align': 'base-line',
                'padding-right': '0px',
                'cursor': 'pointer',
                'color': '#333',
                width: '14px',
                height: '14px',
            });
            return $html;
        },
        _makeText: function (item) {
            if (!item) {
                return '';
            }

            var $html = $('<span></span>');

            $html.text(item.name);
            $html.css({
                padding: '0 0 0 5px'
            });

            return $html;
        },


        /**
         *      视图方法
         */

        _showRoot: function () {
            if (this.opt.is_trigger) {
                this.$html.css({
                    top: this.dom.outerHeight(),
                    left: 0,
                    minWidth: 200
                    // minWidth: this.opt.width ? this.opt.width : this.dom.outerWidth() * 0.98
                });

                this.$html.addClass('xTreePanel');

                this.$html.on('click', function (e) {
                    e.stopPropagation();
                });
            }
            this.dom.append(this.$html);

        },
        _showData: function () {
            if (this._is_first) {
                this._showChildren(this.rootId);
                this._is_first = false;
            } else {
                this.$html.show();
            }
        },

        _expand: function () {
            var that = this;
            if (that.opt.expand === true) {
                $.each(that.data, function (index, item) {
                    if (item.is_node && item.has_children) {
                        that.$html.find('i').filter('.fa-caret-right').click();
                    }
                });
            } else if (that.opt.expand) {
                var expandId = [];
                expandId.push(that.rootId);
                for (var i = 0; i < that.opt.expand + 1; i++) {
                    expandId = that._expandLevel(expandId);
                }
            }
        },
        _expandLevel: function (id) {
            var that = this;
            var expandId = [];
            $.each(id, function (index, item) {
                that.$html.find('div[node-id="' + item + '"] > i').filter('.fa-caret-right').click();
                $.each(that.data, function (index2, item2) {
                    if (item2.nodeId == item && item2.is_node) {
                        expandId.push(item2.id);
                    }
                });
            });
            return expandId;
        },

        _showChildren: function (pid) {
            var showData = this._getChildrenData(pid);
            var itemDiv = this._makeChildren();


            //这里 0节点的结构 和 子节点的结构 没有处理好    以后尽量让node-id 和  itemdiv 分开
            if (pid == this.rootId) {
                itemDiv = $(itemDiv).attr('node-id', this.rootId);
                this.$html.append(itemDiv);
            } else {
                var $childrenWrap = this.$html.find('.x-tree-node-' + pid);
                $childrenWrap.append(itemDiv);
                this._toShrink($childrenWrap.find('.x-tree-self-' + pid + ' > .fa-caret-right'));
            }

            for (var i in showData) {
                itemDiv.append(this._makeItem(showData[i]));
            }
        },
        _removeChildren: function (pid) {
            var $childrenWrap = this.$html.find('.x-tree-node-' + pid);
            $childrenWrap.find('.x-tree-children').remove();
            this._toExpand($childrenWrap.find('.x-tree-self-' + pid + ' > .fa-caret-down'));
        },

        _makeChildren: function () {
            var html = '<div class="x-tree-children"></div>';

            return $(html).css({
                'margin-left': '16px'
            });
        },

        _changeCheckbox: function (item, type) {
            if (type === 1) {

            } else if (type === 2) {

            } else if (type === 3) {

            }
        },

        _toShrink: function (dom) {
            dom.removeClass('fa-caret-right');
            dom.addClass('fa-caret-down');
        },

        _toExpand: function (dom) {
            dom.removeClass('fa-caret-down');
            dom.addClass('fa-caret-right');
        },
    };

})(jQuery);

