#define BUILDING_NODE_EXTENSION
#include <node.h>
#include <v8.h>
#include <locale.h>

using namespace v8;

const char* ToCString(const v8::String::Utf8Value& value) {
    return *value ? *value : "<string conversion failed>";
}

Handle<Value> setlocaleMethod(const Arguments& args) {
    HandleScope scope;
    if (args.Length() == 2 && args[0]->IsInt32()) {
        int category = args[0]->Int32Value();
        if (args[1]->IsString()) {
            String::Utf8Value str(args[1]->ToString());
            const char *ret = setlocale(category, ToCString(str));
            return scope.Close(ret ? String::New(ret) : Undefined());
        } else {
            const char *ret = setlocale(category, NULL);
            return scope.Close(ret ? String::New(ret) : Undefined());
        }
    } else {
        return ThrowException(Exception::Error(
            String::New("Invalid number and/or types of arguments")
        ));
    }
}

void init(Handle<Object> target) {
  target->Set(String::NewSymbol("setlocale"),
      FunctionTemplate::New(setlocaleMethod)->GetFunction());
    target->Set(String::New("LC_ALL"), Uint32::NewFromUnsigned(LC_ALL));
    target->Set(String::New("LC_COLLATE"), Uint32::NewFromUnsigned(LC_COLLATE));
    target->Set(String::New("LC_CTYPE"), Uint32::NewFromUnsigned(LC_CTYPE));
    target->Set(String::New("LC_MESSAGES"), Uint32::NewFromUnsigned(LC_MESSAGES));
    target->Set(String::New("LC_MONETARY"), Uint32::NewFromUnsigned(LC_MONETARY));
    target->Set(String::New("LC_NUMERIC"), Uint32::NewFromUnsigned(LC_NUMERIC));
    target->Set(String::New("LC_TIME"), Uint32::NewFromUnsigned(LC_TIME));
}
NODE_MODULE(setlocale, init)
