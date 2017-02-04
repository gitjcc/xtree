/**
 * Created by Jesse on 2017/2/4.
 */
;(function ($) {
    window.treeTree = function (opt) {
        return new tree(opt);
    };


    var defOpt = {
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
        maxHeight: null,
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
    };

    var init = {
        _is_first: true,  //是不是第一次打开
        _is_open: false,  //是否open
        _searchTimer: '',   //搜索框的定时器
        _rootId: 1314,
        _originId: {nodeId: [], id: []}  //上次打开时候选中了哪一些id
    };
    
    var tree = function (opt) {
        this._init(opt);
        return this;
    };
    
    tree.prototype = {
        _init: function (opt) {
            this.opt = $.extend(true, {}, defOpt, opt);
            this.state = $.extend(true, {}, init);
            
            this.dom = this.opt.dom;
            this.dom.css({'position':'relative'});

            // this.html = this._makePanel();

            this._initData();

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
        _initData: function () {
            this.root = this._getRoot(this.opt.data);
            this.data = this._formatData(this.opt.data);
            console.log(this.data);
        },

        _getRoot: function (idata) {
            var rootId = [];
            var clone = $.extend(true, [], idata);
            for (var i = 0, len = idata.length; i < len; i++) {
                for (var j = i; j < len; j++) {
                    if (idata[i].id === idata[j].nodeId) {
                        // idata[i].is_node = true;
                        clone[j] = null;
                    }
                    if (idata[i].nodeId === idata[j].id) {
                        // idata[j].is_node = true;
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
            //             if (array[i] === array[j]) {
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

        _formatData: function (idata) {
            var odata = {
                id:this.root,
                parent:null
            };
            var level = 0;

            var root = [odata];

            _formatChild(root, idata);

            function _formatChild(parents, tdata){
                var clone = $.extend(true, [], tdata);
                var children = [];
                $.each(parents,function (index,parent) {
                    $.each(tdata,function (itemIndex,item) {
                        if(item.nodeId === parent.id){
                            item.parent = parent;
                            parent[item.name] = item;
                            clone.splice(itemIndex,1);
                            if(item.is_node){
                                children.push(parent[item.name]);
                            }
                        }
                    });
                });
                level ++;
                return _formatChild(children, clone);
            }
        },
    }
    
    
    
    
})(jQuery);