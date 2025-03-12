const express = require("express");
const rethinkdbdash = require("rethinkdbdash");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;
const r = rethinkdbdash({ host: "localhost", port: 28015 });// RethinkDB bağlantısını kurmak için rethinkdbdash kullanıyoruz
// JSON verilerini almak için body-parser'ı kullan
app.use(bodyParser.json());
app.use(cors());
// Veritabanı oluştur (Eğer yoksa)
r.dbList().run().then(databases => {
  if (!databases.includes("blog")) {
    return r.dbCreate("blog").run().then(() => {
      console.log("Blog veritabanı oluşturuldu.");
      return r.db("blog").tableCreate("posts").run();
    }).then(() => {
      console.log("Posts tablosu oluşturuldu.");
    }).catch(err => {
      console.error("Tablo oluşturulamadı: ", err);
    });
  } else {
    console.log("Blog veritabanı zaten mevcut.");
  }
}).catch(err => console.error("Veritabanı listesi alınamadı: ", err));
// Veritabanı silme ve yeniden oluşturma
r.dbList().run().then(databases => {
  if (databases.includes("blog")) {
    return r.dbDrop("blog").run();  // Veritabanını sil
  }
}).then(() => {
  return r.dbCreate("blog").run();  // Yeni veritabanı oluştur
}).then(() => {
  console.log("Blog veritabanı başarıyla oluşturuldu.");
  return r.db("blog").tableCreate("posts").run();  // "posts" tablosunu oluştur
}).then(() => {
  console.log("Posts tablosu başarıyla oluşturuldu.");
}).catch(err => {
  console.error("Hata oluştu:", err);
});
// Yeni gönderi oluşturma (POST)
app.post("/api/posts", (req, res) => {
  const { title, content, author } = req.body;
  r.db("blog").table("posts").insert({
    title,
    content,
    author,
    created_at: new Date().toISOString()
  })
    .run()
    .then(result => res.status(201).json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});
// Tüm gönderileri alma (GET)
app.get("/api/posts", (req, res) => {
  r.db("blog").table("posts").orderBy(r.desc("created_at")).run()
    .then(posts => res.json(posts))
    .catch(err => res.status(500).json({ error: err.message }));
});
// Tek bir gönderiyi alma (GET)
app.get("/api/posts/:id", (req, res) => {
  const { id } = req.params;
  r.db("blog").table("posts").get(id).run()
    .then(post => {
      if (post) res.json(post);
      else res.status(404).json({ error: "Post bulunamadı" });
    })
    .catch(err => res.status(500).json({ error: err.message }));
});
// Gönderi güncelleme (PUT)
app.put("/api/posts/:id", (req, res) => {
  const { id } = req.params;
  const { title, content, author } = req.body;
  r.db("blog").table("posts").get(id).update({
    title, content, author
  }, { returnChanges: true })
    .run()
    .then(result => {
      if (result.replaced === 0) {
        res.status(404).json({ error: "Post bulunamadı veya değişiklik yapılmadı." });
      } else {
        res.json({ message: "Post güncellendi", changes: result.changes });
      }
    })
    .catch(err => res.status(500).json({ error: err.message }));
});
// Gönderi silme (DELETE)
app.delete("/api/posts/:id", (req, res) => {
  const { id } = req.params;

  r.db("blog").table("posts").get(id).delete().run()
    .then(result => {
      if (result.deleted === 0) {
        res.status(404).json({ error: "Post bulunamadı." });
      } else {
        res.json({ message: "Post silindi." });
      }
    })
    .catch(err => res.status(500).json({ error: err.message }));
});
// Genel hata yakalama
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Sunucu hatası, lütfen tekrar deneyin!" });
});
// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
