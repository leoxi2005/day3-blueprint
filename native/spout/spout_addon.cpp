// ============================================================================
// day3-spout — N-API addon: nhận shared D3D11 texture handle từ Electron OSR
// (useSharedTexture) và phát qua Spout (SpoutDX). Windows-only; non-Windows = stub.
// ============================================================================
#include <napi.h>

#ifdef _WIN32
#include <windows.h>
#include <d3d11.h>
#include <dxgi1_2.h>
#include "spoutsdk/SpoutDX.h"

static spoutDX* g_spout = nullptr;

static Napi::Value Open(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  std::string name = info[0].As<Napi::String>().Utf8Value();
  if (!g_spout) g_spout = new spoutDX();
  bool ok = g_spout->OpenDirectX11();
  if (ok) g_spout->SetSenderName(name.c_str());
  return Napi::Boolean::New(env, ok);
}

static Napi::Value SendHandle(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!g_spout) return Napi::Boolean::New(env, false);
  Napi::Buffer<uint8_t> buf = info[0].As<Napi::Buffer<uint8_t>>();
  if (buf.Length() < sizeof(HANDLE)) return Napi::Boolean::New(env, false);
  HANDLE h = *reinterpret_cast<HANDLE*>(buf.Data());
  ID3D11Device* dev = g_spout->GetDX11Device();
  if (!dev || !h) return Napi::Boolean::New(env, false);

  ID3D11Device1* dev1 = nullptr;
  if (FAILED(dev->QueryInterface(__uuidof(ID3D11Device1), reinterpret_cast<void**>(&dev1))) || !dev1)
    return Napi::Boolean::New(env, false);

  ID3D11Texture2D* tex = nullptr;
  HRESULT hr = dev1->OpenSharedResource1(h, __uuidof(ID3D11Texture2D), reinterpret_cast<void**>(&tex));
  dev1->Release();
  if (FAILED(hr) || !tex) return Napi::Boolean::New(env, false);

  // Nếu texture có keyed mutex (Electron dùng) thì phải acquire trước khi đọc.
  IDXGIKeyedMutex* km = nullptr;
  bool locked = false;
  if (SUCCEEDED(tex->QueryInterface(__uuidof(IDXGIKeyedMutex), reinterpret_cast<void**>(&km))) && km) {
    if (SUCCEEDED(km->AcquireSync(0, 8))) locked = true;
  }

  bool ok = g_spout->SendTexture(tex);

  if (km) {
    if (locked) km->ReleaseSync(0);
    km->Release();
  }
  tex->Release();
  return Napi::Boolean::New(env, ok);
}

static Napi::Value Close(const Napi::CallbackInfo& info) {
  if (g_spout) {
    g_spout->ReleaseSender();
    delete g_spout;
    g_spout = nullptr;
  }
  return info.Env().Undefined();
}

static Napi::Value Available(const Napi::CallbackInfo& info) {
  return Napi::Boolean::New(info.Env(), true);
}

#else // ---------------- non-Windows stub ----------------
static Napi::Value Open(const Napi::CallbackInfo& info) { return Napi::Boolean::New(info.Env(), false); }
static Napi::Value SendHandle(const Napi::CallbackInfo& info) { return Napi::Boolean::New(info.Env(), false); }
static Napi::Value Close(const Napi::CallbackInfo& info) { return info.Env().Undefined(); }
static Napi::Value Available(const Napi::CallbackInfo& info) { return Napi::Boolean::New(info.Env(), false); }
#endif

static Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("open", Napi::Function::New(env, Open));
  exports.Set("sendHandle", Napi::Function::New(env, SendHandle));
  exports.Set("close", Napi::Function::New(env, Close));
  exports.Set("available", Napi::Function::New(env, Available));
  return exports;
}

NODE_API_MODULE(day3spout, Init)
