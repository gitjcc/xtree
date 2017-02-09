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

            this.data = this._arrayToTree(this.opt.data);
            console.log(this.data);

            this._checkTreeByIds(this.data, this.opt.sel_ids);
            console.log(this.data);


            this.dom = this.opt.dom;
            this.dom.css({'position': 'relative'});

            // this.html = this._makePanel();

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


        _arrayToTree: function (arrayIn) {
            var rootId = this._getTreeRoot(arrayIn);
            var treeData = {
                amount: arrayIn.length,
                id: rootId,
                name: 'root',
                parent: null,
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
                return false;
            }
            var _continue = fn(tree, input, output);//是否继续遍历
            if (_continue && tree.children) {
                for (var i = 0; i < tree.children.length; i++) {
                    this._traverseTree(tree.children[i], fn, input, output);
                }
            }
            return tree;
        },


    }


})(jQuery);

