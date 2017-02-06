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

            this.opt.data = this.opt.sel_ids ? this._selData(this.opt.data, this.opt.sel_ids) : this.opt.data;

            this.data = this._arrayToTree(this.opt.data);
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

        _selData: function (data, selected) {
            var sel_ids = selected.split(',');
            for (var i = 0; i < sel_ids.length; i++) {
                for (var j = 0; j < data.length; j++) {
                    if (data[j].id === parseInt(sel_ids[i])) {
                        data[j].is_check = true;
                        this._selParent(data, data[j].nodeId);
                        if (data[j].is_node) {
                            this._selChildren(data, data[j].id);
                        }
                    }
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
                if (data[i].id == nid) {
                    sel_p = data[i];
                }
                if (data[i].nodeId == nid && !data[i].is_check) {
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
                if (data[i].nodeId === id) {
                    data[i].is_check = true;
                    if (data[i].is_node) {
                        this._selChildren(data, data[i].id);
                    }
                }

            }
        },

        _arrayToTree: function (arrayIn) {
            var rootId = this._getTreeRoot(arrayIn);
            var treeData = {
                id: rootId,
                name: 'root',
                parent: null,
                level: 0
            };
            treeData.children = this._getSubTree(arrayIn, treeData);
            treeData.treeDepth = this._getTreeDepth(treeData);
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

        _getTreeDepth: function (tree, level) {
            var maxDepth = level;
            if (tree.children) {
                for (var i = 0; i < tree.children.length; i++) {
                    this._getTreeDepth(tree.children[i], maxDepth);
                }
            }
            return maxDepth;
        },
        _getTreeLeaves: function (tree) {
            var leaves = [];
            for (var i = 0; i < tree.children.length; i++) {
                if(tree.is_node){
                    leaves = this._getTreeLeaves(tree.children[i]);
                }else{
                    leaves.push(tree);
                }
            }
            return leaves;
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
        }
    }


})(jQuery);

