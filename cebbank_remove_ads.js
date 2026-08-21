/**
 * 光大银行去广告脚本 v1
 * 功能：重写 static.cebbank.com 布局配置 JSON，
 *       清空开屏广告(ClientNoticeList) / 首页弹窗广告(HomePopList)
 *       以及常见的 banner/notice/popup 推广数组。
 * 特征：处理成功会在响应头附加 X-Loon-AdBlock: removed=N
 * @author WorkBuddy
 * @date 2026-08-21
 */

(function () {
    'use strict';

    const VERSION = 'v1';
    const HOST = ($request && $request.headers) ? ($request.headers['Host'] || '') : '';

    let body = $response.body;
    if (!body || typeof body !== 'string') {
        $done({});
        return;
    }

    let removed = 0;

    try {
        let obj = JSON.parse(body);

        // ---- 布局配置外层：Contents 数组 ----
        if (obj && Array.isArray(obj.Contents)) {
            obj.Contents.forEach(item => {
                if (!item || !item.ContentJson) return;
                let cj;
                try { cj = JSON.parse(item.ContentJson); } catch (e) { return; }

                // 1) 开屏广告列表
                if (Array.isArray(cj.ClientNoticeList) && cj.ClientNoticeList.length > 0) {
                    const before = cj.ClientNoticeList.length;
                    cj.ClientNoticeList = cj.ClientNoticeList.map(() => ({
                        advertImg: '', detailUrl: '', start_date: '',
                        end_date: '', probability: '', imgType: ''
                    }));
                    removed += before;
                    console.log(`[光大去广告] ${VERSION} 清空开屏广告 ClientNoticeList x${before}`);
                }

                // 2) 首页弹窗广告列表
                if (Array.isArray(cj.HomePopList) && cj.HomePopList.length > 0) {
                    const before = cj.HomePopList.length;
                    cj.HomePopList = cj.HomePopList.map(() => ({
                        AdvId: '', AdvName: '', picurl: '', detailurl: '', probability: '', targetFlag: ''
                    }));
                    removed += before;
                    console.log(`[光大去广告] ${VERSION} 清空首页弹窗 HomePopList x${before}`);
                }

                // 3) 通用推广数组兜底（保留结构、清空数据）
                const adKeys = ['bannerList', 'adList', 'advList', 'promoList',
                                'recommendList', 'activityList', 'noticeList',
                                'popupList', 'floatList', 'ClientBannerList'];
                adKeys.forEach(key => {
                    if (Array.isArray(cj[key]) && cj[key].length > 0) {
                        removed += cj[key].length;
                        console.log(`[光大去广告] ${VERSION} 清空 ${key} x${cj[key].length}`);
                        cj[key] = [];
                    }
                });

                // 4) 单条字段置空
                ['advertImg', 'adUrl', 'bannerUrl', 'picurl', 'popupUrl', 'floatUrl', 'noticeContent'].forEach(f => {
                    if (cj[f]) { removed += 1; cj[f] = ''; }
                });

                item.ContentJson = JSON.stringify(cj);
            });
        }

        // ---- 顶层直接是广告数组的兜底 ----
        if (Array.isArray(obj) && obj.length > 0) {
            const isAdArray = obj.some(i => i && (i.advertImg || i.picurl || i.bannerUrl || i.AdvId || i.AdId));
            if (isAdArray) {
                removed += obj.length;
                obj = [];
                console.log(`[光大去广告] ${VERSION} 清空顶层广告数组 x${removed}`);
            }
        }

        body = JSON.stringify(obj);
    } catch (e) {
        console.log(`[光大去广告] ${VERSION} 响应解析失败(${HOST}): ${e.message}`);
        $done({});
        return;
    }

    const headers = Object.assign({}, $response.headers);
    headers['X-Loon-AdBlock'] = `removed=${removed};${VERSION}`;

    console.log(`[光大去广告] ${VERSION} OK host=${HOST} removed=${removed}`);
    $done({ body, headers });
})();
