# _res —— 文章配图目录

所有 md / html 文章共用的图片放这里，**不要**每篇文章旁边各建一个 _res。

## 引用方式

md 放在 `data/articles/<地图id>/xxx.md` 时，用 `../` 退回一级：

```md
![说明](../_res/图片名.jpeg)
```

指向的实际文件是 `data/articles/_res/图片名.jpeg`。

## 命名建议

用「地图-道具」的英文短名，避免以后混乱：

```
paris-bar75r.jpeg
sgaill-katana-1.jpeg
newyork-golden-bartoli-1.jpeg
```

## 让「AI 重建」也带上图片

AI 只能读写文本，图片是二进制，必须先实际存在于 AI 的工程目录里。
把本目录整个复制到：

```
/data/user/0/com.webtoapp/files/aicoding/sessions/de0da991-28d0-4aa6-9041-fbedf6325ae6/app/data/articles/
```

（MT管理器 复制粘贴即可，不需要命令行）
