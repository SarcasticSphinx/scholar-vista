"use client";


import { useEffect, useState } from "react";
import Image from "next/image";

type CampusCard = {
    name: string;
    country: string;
    image: string;
};

/**
 * Curated campuses for the hero deck. These map to the photos downloaded
 * into `public/campus/`. Purely decorative; kept small on purpose.
 */
const CAMPUSES: CampusCard[] = [
    { name: "University of Cambridge", country: "United Kingdom", image: "/campus/univ-cambridge.jpg" },
    { name: "University of Toronto", country: "Canada", image: "/campus/univ-toronto.jpg" },
    { name: "University of Melbourne", country: "Australia", image: "/campus/univ-melbourne.jpg" },
    { name: "Tsinghua University", country: "China", image: "/campus/univ-tsinghua.jpg" },
    { name: "MIT", country: "United States", image: "/campus/univ-mit.jpg" },
];

/** How long each card stays at the front before the deck advances. */
const CYCLE_MS = 3200;

/** Transform for a card at visual depth `pos` (0 = front, centered/upright). */
function transformForPosition(pos: number): { transform: string; zIndex: number } {
    const side = pos === 0 ? 0 : pos % 2 === 1 ? -1 : 1;
    const rotate = side * (4 + pos * 2);
    const translateX = side * (30 + pos * 8);
    const translateY = pos * 14;
    const scale = 1 - pos * 0.04;
    return {
        transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${scale})`,
        zIndex: CAMPUSES.length - pos,
    };
}

export function HeroUniversityStack() {
    const [front, setFront] = useState(0);
    const [animate, setAnimate] = useState(true);

    useEffect(() => {
        // Honour reduced-motion: render statically without auto-advancing.
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (mq.matches) {
            setAnimate(false);
            return;
        }
        const id = window.setInterval(() => {
            setFront((f) => (f + 1) % CAMPUSES.length);
        }, CYCLE_MS);
        return () => window.clearInterval(id);
    }, []);

    const n = CAMPUSES.length;

    return (
        <div
            aria-hidden="true"
            className="relative mx-auto aspect-[4/5] w-full max-w-md"
        >
            {CAMPUSES.map((campus, i) => {
                // Visual depth of this card given the current front index.
                const pos = (i - front + n) % n;
                const { transform, zIndex } = transformForPosition(pos);

                return (
                    <div
                        key={campus.image}
                        className={
                            "absolute inset-0 flex items-center justify-center" +
                            (animate ? " transition-transform duration-700 ease-out" : "")
                        }
                        style={{ transform, zIndex }}
                    >
                        <div className="relative flex aspect-[4/5] w-4/5 flex-col justify-end overflow-hidden rounded-3xl border bg-card shadow-xl">
                            <Image
                                src={campus.image}
                                alt=""
                                fill
                                priority={i === 0}
                                sizes="(min-width: 1024px) 320px, 0px"
                                className="object-cover"
                            />
                            {/* Legibility gradient behind the caption. */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                            <div className="relative p-5 text-white">
                                <p className="truncate font-serif text-lg font-semibold drop-shadow">
                                    {campus.name}
                                </p>
                                <p className="truncate text-sm text-white/80 drop-shadow">
                                    {campus.country}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
