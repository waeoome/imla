package com.wael.darbimla;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.AssetManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.JavascriptInterface;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * غلاف أندرويد لتطبيق «درب الإملاء».
 * ملفات الموقع مضمّنة في assets/www وتُخدَّم من عنوان https داخلي، فيعمل التطبيق دون إنترنت.
 * ولأن WebView في أندرويد لا يدعم speechSynthesis، يُربط النطق بمحرّك النطق في الهاتف.
 */
public class MainActivity extends Activity {

    static final String HOST = "appassets.androidplatform.net";
    static final String HOME = "https://" + HOST + "/index.html";

    private WebView web;
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;

    /* بديل speechSynthesis يُحقن في أول كل صفحة قبل سكربتات التطبيق */
    static final String SHIM =
        "<script>(function(){if(window.speechSynthesis||!window.AndroidTTS){return;}" +
        "var cur=null,seq=0;" +
        "function V(){return {name:'Android Arabic',lang:'ar-SA',voiceURI:'android-ar','default':true,localService:true};}" +
        "window.SpeechSynthesisUtterance=function(t){this.text=t||'';this.lang='ar-SA';this.rate=1;this.pitch=1;this.volume=1;this.voice=null;};" +
        "window.__ttsEv=function(id,ev){if(!cur||cur.id!==id){return;}var u=cur.u;" +
        "try{if(ev==='start'){if(u.onstart){u.onstart({});}}" +
        "else if(ev==='end'){cur=null;if(u.onend){u.onend({});}}" +
        "else{cur=null;if(u.onerror){u.onerror({error:ev});}}}catch(e){}};" +
        "var ss={speaking:false,pending:false,paused:false,onvoiceschanged:null," +
        "getVoices:function(){return AndroidTTS.ready()?[V()]:[];}," +
        "speak:function(u){var id=String(++seq);cur={id:id,u:u};AndroidTTS.speak(String(u.text||''),+u.rate||1,id);}," +
        "cancel:function(){cur=null;AndroidTTS.stop();}," +
        "pause:function(){},resume:function(){},addEventListener:function(){},removeEventListener:function(){}};" +
        "window.speechSynthesis=ss;" +
        "window.__ttsVoices=function(){try{if(ss.onvoiceschanged){ss.onvoiceschanged();}}catch(e){}};" +
        "})();</script>";

    static final Map<String, String> MIME = new HashMap<>();
    static {
        MIME.put("html", "text/html");
        MIME.put("htm", "text/html");
        MIME.put("js", "application/javascript");
        MIME.put("css", "text/css");
        MIME.put("json", "application/json");
        MIME.put("webmanifest", "application/manifest+json");
        MIME.put("mp3", "audio/mpeg");
        MIME.put("png", "image/png");
        MIME.put("jpg", "image/jpeg");
        MIME.put("svg", "image/svg+xml");
        MIME.put("ico", "image/x-icon");
        MIME.put("woff2", "font/woff2");
        MIME.put("woff", "font/woff");
        MIME.put("ttf", "font/ttf");
        MIME.put("txt", "text/plain");
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                int r = tts.setLanguage(new Locale("ar"));
                ttsReady = r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED;
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) { ev(id, "start"); }
                    @Override public void onDone(String id) { ev(id, "end"); }
                    @Override public void onError(String id) { ev(id, "synthesis-failed"); }
                    @Override public void onStop(String id, boolean interrupted) { ev(id, "interrupted"); }
                });
                runOnUiThread(() -> { if (web != null) web.evaluateJavascript("window.__ttsVoices&&__ttsVoices()", null); });
            }
        });

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportMultipleWindows(false);
        s.setAllowFileAccess(false);
        s.setTextZoom(100);

        web.addJavascriptInterface(new TtsBridge(), "AndroidTTS");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
                return serve(req.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return false;
                openOutside(u);
                return true;
            }
        });

        // عامل الخدمة (sw.js) يطلب الملفات من المصدر نفسه
        if (Build.VERSION.SDK_INT >= 24) {
            try {
                ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
                    @Override
                    public WebResourceResponse shouldInterceptRequest(WebResourceRequest req) {
                        return serve(req.getUrl());
                    }
                });
            } catch (Throwable ignored) { }
        }

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(HOME);
    }

    /* يخدم ملفات assets/www تحت العنوان الداخلي، ويترك غيرها (كالخطوط من الإنترنت) للشبكة */
    WebResourceResponse serve(Uri u) {
        if (u == null || !HOST.equals(u.getHost())) return null;
        String path = u.getPath();
        if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
        if (path.endsWith("/")) path += "index.html";
        if (path.contains("..")) return notFound();
        String ext = path.contains(".") ? path.substring(path.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT) : "";
        String mime = MIME.containsKey(ext) ? MIME.get(ext) : "application/octet-stream";
        try {
            AssetManager am = getAssets();
            InputStream in = am.open("www" + path);
            boolean text = mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json");
            if (ext.equals("html") || ext.equals("htm")) {
                String html = new String(readAll(in), StandardCharsets.UTF_8);
                in = new ByteArrayInputStream(injectShim(html).getBytes(StandardCharsets.UTF_8));
            }
            WebResourceResponse r = new WebResourceResponse(mime, text ? "utf-8" : null, in);
            Map<String, String> h = new HashMap<>();
            h.put("Access-Control-Allow-Origin", "*");
            h.put("Cache-Control", "no-cache");
            r.setResponseHeaders(h);
            return r;
        } catch (IOException e) {
            return notFound();
        }
    }

    static String injectShim(String html) {
        int i = html.indexOf("<meta charset");
        if (i >= 0) {
            int j = html.indexOf('>', i);
            if (j > 0) return html.substring(0, j + 1) + SHIM + html.substring(j + 1);
        }
        int k = html.indexOf("<script");
        if (k >= 0) return html.substring(0, k) + SHIM + html.substring(k);
        return SHIM + html;
    }

    static WebResourceResponse notFound() {
        WebResourceResponse r = new WebResourceResponse("text/plain", "utf-8",
                new ByteArrayInputStream(new byte[0]));
        r.setStatusCodeAndReasonPhrase(404, "Not Found");
        return r;
    }

    static byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        in.close();
        return out.toByteArray();
    }

    void openOutside(Uri u) {
        try {
            String sc = u.getScheme() == null ? "" : u.getScheme();
            Intent i = sc.equals("mailto") ? new Intent(Intent.ACTION_SENDTO, u) : new Intent(Intent.ACTION_VIEW, u);
            startActivity(i);
        } catch (ActivityNotFoundException ignored) { }
    }

    void ev(String id, String what) {
        runOnUiThread(() -> {
            if (web != null) web.evaluateJavascript(
                    "window.__ttsEv&&__ttsEv('" + id.replaceAll("[^0-9]", "") + "','" + what + "')", null);
        });
    }

    class TtsBridge {
        @JavascriptInterface
        public boolean ready() { return ttsReady; }

        @JavascriptInterface
        public void speak(String text, double rate, String id) {
            if (tts == null) { ev(id, "synthesis-unavailable"); return; }
            tts.setSpeechRate((float) Math.max(0.3, Math.min(2.0, rate)));
            int r = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id);
            if (r != TextToSpeech.SUCCESS) ev(id, "synthesis-failed");
        }

        @JavascriptInterface
        public void stop() { if (tts != null) tts.stop(); }
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        if (web != null) web.saveState(out);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (tts != null) tts.stop();
        if (web != null) web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (tts != null) tts.shutdown();
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
