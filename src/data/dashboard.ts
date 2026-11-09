/**
 * 实时 Token 看板配置
 *
 * 看板本体在 token-dashboard 项目里，按 collector 模式部署到自己的服务器，
 * 本机 serve_live.py --push 把增量推上去。
 *
 * 填好 url 后重新构建即可，导航栏会自动出现「看板」入口；留空则不显示。
 *
 * 建议用 /token/ 这类子路径挂在自己的域名下（同域名最省心）。
 * 独立子域名也行，但看板侧必须是 HTTPS，且服务器要能识别 HTTPS
 * （nginx 传 X-Forwarded-Proto，见 token-dashboard 仓库 deploy/nginx.conf）。
 */
export const dashboard = {
  /** 看板公网地址，例：'https://stats.example.com/token/'（必须 HTTPS，否则会被博客拦掉） */
  url: 'https://lxyling.cn/token/',
  /** 只读口令，对应服务器上的 TD_PUBLIC_TOKEN；会公开在页面源码里，别填 TD_TOKEN */
  token: 'bdece53f8fb0deb5',
}
